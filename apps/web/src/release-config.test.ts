// Production is released only by .github/workflows/release.yml, which builds
// main on Vercel, migrates, and then makes the build live. Nothing releases on
// its own: a deploy ticket or a hand-run workflow starts each release. The
// integration branch deploys only to a preview (integration.yml). These tests
// keep the other paths closed: Vercel's own Git deployments, a release on
// push, a production deploy from integration, and a build that migrates the
// database.
import { describe, expect, test } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import vercelJson from "../vercel.json" with { type: "json" };

const WORKFLOWS = import.meta.glob<string>(
  [
    "../../../.github/workflows/release.yml",
    "../../../.github/workflows/integration.yml",
  ],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);
const releaseWorkflow: string =
  WORKFLOWS["../../../.github/workflows/release.yml"] ?? "";
const integrationWorkflow: string =
  WORKFLOWS["../../../.github/workflows/integration.yml"] ?? "";

// A trigger is a two-space-indented key under `on:`.
const TRIGGER = /^ {2}(?<name>\w+):/u;
const TOP_LEVEL = /^\S/u;

function triggers(workflow: string): string[] {
  const lines = workflow.split("\n");
  const start = lines.indexOf("on:") + 1;
  const end = lines.findIndex((line, i) => i >= start && TOP_LEVEL.test(line));
  return lines
    .slice(start, end)
    .flatMap((line) => line.match(TRIGGER)?.[1] ?? []);
}

// A step starts at a six-space `- ` line, under the job's `steps:`.
const STEP_START = /^ {6}- /u;
const STEPS_INDENT = 6;
const JOB_INDENT = 4;
const STEP_INDENT = 8;
const CANCELLED_CHECK = /failure\|cancelled|= cancelled/u;
// A Vercel CLI command that looks up the token's user, which answers "User
// not found" with the workflows' token (#151, #239), run as a command rather
// than named in a message.
const USER_LOOKUP_COMMAND =
  /(?:^\s*|npx\s+)vercel\s+(?:promote|inspect|rollback|whoami|ls)\b/mu;
const COMMENT_LINE = /^\s*#/u;
// The report step reads the deployment id from the build step.
const DEPLOYMENT_ID_INPUT =
  /DEPLOYMENT_ID: \$\{\{ steps\.build\.outputs\.id \}\}/u;

// The lines of the step whose `id:` or `name:` is `value`, from its `- ` line
// up to the next step or the end of the steps.
function stepBlock(
  workflow: string,
  key: "id" | "name",
  value: string,
): string {
  const lines = workflow.split("\n");
  const match = lines.findIndex(
    (line) =>
      line === `        ${key}: ${value}` ||
      line === `      - ${key}: ${value}`,
  );
  if (match === -1) {
    throw new Error(`No step has ${key}: ${value}`);
  }
  let start = match;
  while (start > 0 && !STEP_START.test(lines[start] ?? "")) {
    start -= 1;
  }
  let end = match + 1;
  while (end < lines.length) {
    const line = lines[end] ?? "";
    const indent = line.length - line.trimStart().length;
    if (
      STEP_START.test(line) ||
      (line.trim() !== "" && indent < STEPS_INDENT)
    ) {
      break;
    }
    end += 1;
  }
  return lines.slice(start, end).join("\n");
}

// The `timeout-minutes` at an indentation: 4 for the job, 8 for a step.
function minutes(block: string, indent: number): number | undefined {
  const prefix = `${" ".repeat(indent)}timeout-minutes: `;
  const line = block.split("\n").find((l) => l.startsWith(prefix));
  if (line === undefined) {
    return undefined;
  }
  return Number(line.slice(prefix.length));
}

describe("release configuration", () => {
  test("Vercel never deploys any branch from Git", () => {
    expect(vercelJson.git.deploymentEnabled).toBe(false);
  });

  test("the release workflow starts only from a deploy ticket or by hand", () => {
    expect(triggers(releaseWorkflow)).toEqual(["issues", "workflow_dispatch"]);
    expect(releaseWorkflow).toContain("github.event.label.name == 'deploy'");
    expect(releaseWorkflow).toContain("ref: main");
  });

  test("the integration workflow deploys only a preview of integration", () => {
    expect(triggers(integrationWorkflow)).toEqual([
      "push",
      "workflow_dispatch",
    ]);
    expect(integrationWorkflow).toContain("branches: [integration]");
    expect(integrationWorkflow).not.toContain("--prod");
    expect(integrationWorkflow).not.toContain("vercel promote");
    expect(integrationWorkflow).not.toContain("drizzle-kit");
  });

  test("no build script runs drizzle-kit", () => {
    const scripts: Readonly<Record<string, string>> = packageJson.scripts;
    for (const name of ["build", "vercel-build"]) {
      expect(scripts[name] ?? "").not.toContain("drizzle-kit");
    }
  });
});

// The failure report must run however a release stops (issue #149).
describe("release failure reports", () => {
  // A step past its own limit fails while the job still runs, so the
  // failure report runs too (issue #149).
  test("long release steps time out before the job does", () => {
    const job = minutes(releaseWorkflow, JOB_INDENT);
    expect(job).toBeDefined();
    let sum = 0;
    for (const id of ["build", "promote", "migrate", "smoke"]) {
      const step = minutes(stepBlock(releaseWorkflow, "id", id), STEP_INDENT);
      expect(step, `step ${id} has no timeout-minutes`).toBeDefined();
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(job ?? 0);
      sum += step ?? 0;
    }
    expect(sum).toBeLessThan(job ?? 0);
  });

  test("the failure report also runs when the release is cancelled", () => {
    const report = stepBlock(releaseWorkflow, "name", "Report the failure");
    const condition =
      report.split("\n").find((line) => line.startsWith("        if: ")) ?? "";
    expect(condition).toContain("failure()");
    expect(condition).toContain("cancelled()");
    expect(condition).toContain("steps.who.outcome != 'failure'");
    expect(report).toMatch(CANCELLED_CHECK);
  });

  // A release-failed issue whose `ops` label was removed still gets the
  // next failure's comment, not a duplicate issue.
  test("the open release-failed issue is found by title alone", () => {
    const report = stepBlock(releaseWorkflow, "name", "Report the failure");
    const listStart = report.indexOf("gh issue list");
    expect(listStart).toBeGreaterThan(-1);
    const list = report.slice(listStart, report.indexOf("--json", listStart));
    expect(list).not.toContain("--label");
    expect(list).toContain("in:title");
    expect(report).toContain("select(.title == $title)");
    const createStart = report.indexOf("gh issue create");
    expect(createStart).toBeGreaterThan(-1);
    const create = report.slice(
      createStart,
      report.indexOf("--body-file", createStart),
    );
    expect(create).toContain("--label ops");
  });
});

// Vercel's CLI answers "User not found" to `promote` with the workflows'
// token, so the release goes live through the REST API (#239).
describe("going live", () => {
  test("no workflow runs a Vercel CLI command that looks up the user", () => {
    for (const workflow of [releaseWorkflow, integrationWorkflow]) {
      const code = workflow
        .split("\n")
        .filter((line) => !COMMENT_LINE.test(line))
        .join("\n");
      expect(code).not.toMatch(USER_LOOKUP_COMMAND);
    }
  });

  test("the release goes live through the REST API promote script", () => {
    const goLive = stepBlock(releaseWorkflow, "id", "promote");
    expect(goLive).toContain(
      '.github/scripts/vercel-promote.sh" "$DEPLOYMENT_ID"',
    );
    expect(goLive).toContain(".github/scripts/vercel-deployment.sh");
  });

  // After Migrate, the old build serves the new schema until Go live
  // succeeds, so its failure names the deployment to promote (#239).
  test("a Go live failure warns that production may be broken", () => {
    const report = stepBlock(releaseWorkflow, "name", "Report the failure");
    const start = report.indexOf('elif stopped "$PROMOTE"');
    expect(start).toBeGreaterThan(-1);
    const branch = report.slice(start, report.indexOf("elif", start + 1));
    expect(branch).toContain("Production may be broken");
    expect(branch).toContain("previous build may be serving the new schema");
    expect(branch).toContain("${DEPLOYMENT_ID");
    expect(branch).toContain("vercel promote ${DEPLOYMENT_URL");
    expect(branch).toContain("--scope modest-progress");
    expect(branch).toContain("fix forward");
    expect(report).toMatch(DEPLOYMENT_ID_INPUT);
  });
});
