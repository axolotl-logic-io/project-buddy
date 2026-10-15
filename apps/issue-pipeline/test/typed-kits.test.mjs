// The installer and the shared test kits are typed and linted (#219):
// `npm run typecheck` also runs tsconfig.test.json, each of them opts in to it
// with `// @ts-check`, and Biome reports nothing on them, infos included.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const APP = path.join(import.meta.dirname, "..");
// The files that tsconfig.test.json type-checks and Biome must find clean.
const TYPED_FILES = [
  "install.mjs",
  "test/fake-gh.mjs",
  "test/ops-claim-test-kit.mjs",
  "test/ops-cli-test-kit.mjs",
  "test/ops-fixture.mjs",
  "test/ops-run-test-kit.mjs",
  "test/ops-test-kit.mjs",
  "test/verify-test-kit.mjs",
  "test/workflow-build-test-kit.mjs",
  "test/workflow-checks-test-kit.mjs",
  "test/workflow-context-test-kit.mjs",
  "test/workflow-finish-test-kit.mjs",
  "test/workflow-fix-test-kit.mjs",
  "test/workflow-harness.mjs",
  "test/workflow-review-test-kit.mjs",
  "test/workflow-stages-fixtures.mjs",
  "test/workflow-triage-test-kit.mjs",
];
// The typecheck step that covers the files above.
const TEST_TYPECHECK = "tsc -p tsconfig.test.json";
// The opt-in line, first or right after a `#!` line.
const TS_CHECK = /^(?:#!.*\n)?\/\/ @ts-check\n/u;
// Biome's summary when it reports any diagnostic, infos included.
const BIOME_FOUND = /Found \d+/u;

test("npm run typecheck also checks the kits and the installer", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(APP, "package.json"), "utf8"),
  );
  assert.ok(
    pkg.scripts.typecheck.includes(TEST_TYPECHECK),
    pkg.scripts.typecheck,
  );
});

test("the kits and the installer opt in to the type check", () => {
  for (const file of TYPED_FILES) {
    const text = fs.readFileSync(path.join(APP, file), "utf8");
    assert.match(text, TS_CHECK, file);
  }
});

test("Biome reports nothing on the kits and the installer", () => {
  const args = [
    "biome",
    "lint",
    "--error-on-warnings",
    "--diagnostic-level=info",
    ...TYPED_FILES,
  ];
  const { status, stdout, stderr } = spawnSync("npx", args, {
    cwd: APP,
    encoding: "utf8",
  });
  const output = `${stdout}${stderr}`;
  assert.equal(status, 0, output);
  assert.doesNotMatch(output, BIOME_FOUND, output);
});
