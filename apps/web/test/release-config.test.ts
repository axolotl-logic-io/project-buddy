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
import {
  at,
  isMapping,
  parseWorkflow,
  stepOf,
  stepsOf,
  textAt,
  type YamlMapping,
} from "./release-config-test-kit.ts";

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

const release = parseWorkflow(releaseWorkflow);
const integration = parseWorkflow(integrationWorkflow);

const CANCELLED_CHECK = /failure\|cancelled|= cancelled/u;
// A Vercel CLI command that looks up the token's user, which answers "User
// not found" with the workflows' token (#151, #239), run as a command rather
// than named in a message.
const USER_LOOKUP_COMMAND =
  /(?:^\s*|npx\s+)vercel\s+(?:promote|inspect|rollback|whoami|ls)\b/mu;
const COMMENT_LINE = /^\s*#/u;
// The report's branch for a failed Go live step, up to the next branch.
const GO_LIVE_BRANCH =
  /elif stopped "\$PROMOTE"(?<branch>[\s\S]*?)\b(?:elif|else|fi)\b/u;

// The keys under the workflow's `on:`.
function triggers(workflow: YamlMapping): readonly string[] {
  const on = at(workflow, "on");
  if (!isMapping(on)) {
    return [];
  }
  return Object.keys(on);
}

// A step's or job's `timeout-minutes`, or NaN when it has none.
function minutes(mapping: YamlMapping): number {
  const text = textAt(mapping, "timeout-minutes");
  if (text === "") {
    return Number.NaN;
  }
  return Number(text);
}

describe("release configuration", () => {
  test("Vercel never deploys any branch from Git", () => {
    expect(vercelJson.git.deploymentEnabled).toBe(false);
  });

  test("the release workflow starts only from a deploy ticket or by hand", () => {
    expect(triggers(release)).toEqual(["issues", "workflow_dispatch"]);
    expect(textAt(release, "jobs", "release", "if")).toContain(
      "github.event.label.name == 'deploy'",
    );
    const checkouts = stepsOf(release, "release").filter((step) =>
      textAt(step, "uses").startsWith("actions/checkout@"),
    );
    expect(checkouts.length).toBeGreaterThan(0);
    for (const checkout of checkouts) {
      expect(textAt(checkout, "with", "ref")).toBe("main");
    }
  });

  test("the integration workflow deploys only a preview of integration", () => {
    expect(triggers(integration)).toEqual(["push", "workflow_dispatch"]);
    expect(at(integration, "on", "push", "branches")).toEqual(["integration"]);
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
    const releaseJob = at(release, "jobs", "release");
    if (!isMapping(releaseJob)) {
      throw new Error("The release workflow has no release job");
    }
    const job = minutes(releaseJob);
    expect(job).toBeGreaterThan(0);
    let sum = 0;
    for (const id of ["build", "promote", "migrate", "smoke"]) {
      const step = minutes(stepOf(release, "release", "id", id));
      expect(step, `step ${id} has no timeout-minutes`).toBeGreaterThan(0);
      expect(step).toBeLessThan(job);
      sum += step;
    }
    expect(sum).toBeLessThan(job);
  });

  test("the failure report also runs when the release is cancelled", () => {
    const report = stepOf(release, "release", "name", "Report the failure");
    const condition = textAt(report, "if");
    expect(condition).toContain("failure()");
    expect(condition).toContain("cancelled()");
    expect(condition).toContain("steps.who.outcome != 'failure'");
    expect(textAt(report, "run")).toMatch(CANCELLED_CHECK);
  });

  // A release-failed issue whose `ops` label was removed still gets the
  // next failure's comment, not a duplicate issue.
  test("the open release-failed issue is found by title alone", () => {
    const report = textAt(
      stepOf(release, "release", "name", "Report the failure"),
      "run",
    );
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
    const goLive = textAt(stepOf(release, "release", "id", "promote"), "run");
    expect(goLive).toContain(
      '.github/scripts/vercel-promote.sh" "$DEPLOYMENT_ID"',
    );
    expect(goLive).toContain(".github/scripts/vercel-deployment.sh");
  });

  // After Migrate, the old build serves the new schema until Go live
  // succeeds, so its failure names the deployment to promote (#239).
  test("a Go live failure names the deployment to promote", () => {
    const report = stepOf(release, "release", "name", "Report the failure");
    const { branch = "" } =
      GO_LIVE_BRANCH.exec(textAt(report, "run"))?.groups ?? {};
    expect(branch).toContain("${DEPLOYMENT_ID");
    expect(branch).toContain("${DEPLOYMENT_URL");
    expect(branch).toContain("vercel promote");
    expect(textAt(report, "env", "DEPLOYMENT_ID")).toContain(
      "steps.build.outputs.id",
    );
  });
});
