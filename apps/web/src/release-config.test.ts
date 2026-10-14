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
