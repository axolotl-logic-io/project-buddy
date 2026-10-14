// Production is released only by .github/workflows/release.yml, which builds
// on Vercel, migrates, and then makes the build live. Nothing deploys on its
// own: a deploy ticket or a hand-run workflow starts each release. These tests
// keep the other paths closed: Vercel's own Git deployments, a release on push,
// and a build that migrates the database.
import { describe, expect, test } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import vercelJson from "../vercel.json" with { type: "json" };

const WORKFLOWS = import.meta.glob<string>(
  "../../../.github/workflows/release.yml",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);
const releaseWorkflow: string = Object.values(WORKFLOWS)[0] ?? "";

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
  });

  test("no build script runs drizzle-kit", () => {
    const scripts: Readonly<Record<string, string>> = packageJson.scripts;
    for (const name of ["build", "vercel-build"]) {
      expect(scripts[name] ?? "").not.toContain("drizzle-kit");
    }
  });
});
