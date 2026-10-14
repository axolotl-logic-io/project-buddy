// Production is released only by .github/workflows/release.yml, which builds
// on Vercel, migrates, and then makes the build live. These tests keep the
// two older paths closed: Vercel's own Git deployments of main, and a build
// that migrates the database.
import { describe, expect, test } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import vercelJson from "../vercel.json" with { type: "json" };

describe("release configuration", () => {
  test("Vercel never deploys main from Git", () => {
    expect(vercelJson.git.deploymentEnabled.main).toBe(false);
  });

  test("no build script runs drizzle-kit", () => {
    const scripts: Readonly<Record<string, string>> = packageJson.scripts;
    for (const name of ["build", "vercel-build"]) {
      expect(scripts[name] ?? "").not.toContain("drizzle-kit");
    }
  });
});
