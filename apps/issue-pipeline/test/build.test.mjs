// build.ts into a temporary folder: the built workflow is still an async
// function body with no imports, and the built ops CLI answers as src/ops.mjs
// does. It builds into its own folder, so it never races install.test.mjs,
// which builds dist/.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const script = new URL("../build.ts", import.meta.url).pathname;
const srcOps = new URL("../src/ops.mjs", import.meta.url).pathname;
const tmp = fs.mkdtempSync("/tmp/issue-pipeline-build-");
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
const built = spawnSync(process.execPath, [script, tmp], { encoding: "utf8" });
const workflow = fs.existsSync(path.join(tmp, "workflow.js")) ? fs.readFileSync(path.join(tmp, "workflow.js"), "utf8") : "";
const builtOps = path.join(tmp, "ops.mjs");
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const runOps = (file, input) =>
  spawnSync(process.execPath, [file], { input, encoding: "utf8", env: { ...process.env, ISSUE_PIPELINE_ROOT: tmp } });

test("the build succeeds and the workflow compiles as an async function body", () => {
  assert.equal(built.status, 0, built.stderr);
  assert.doesNotThrow(() => new AsyncFunction("args", workflow));
});

test("the built workflow stays a sandboxed body with no imports", () => {
  for (const banned of [/\basync\b/u, /\bimport\b/u, /\brequire\(/u, /node:/u, /child_process/u]) {
    assert.doesNotMatch(workflow, banned);
  }
});

test("the built workflow rejects a missing config as the source does", async () => {
  await assert.rejects(new AsyncFunction("args", workflow)({}), /args\.config must be/u);
});

test("the built ops parses and keeps its #! line", () => {
  const r = spawnSync(process.execPath, ["--check", builtOps], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.readFileSync(builtOps, "utf8").startsWith("#!/usr/bin/env node\n"));
});

for (const [name, input] of [
  ["no request", "nothing"],
  ["an unknown op", 'BEGIN_OPS_REQUEST {"op":"nope"} END_OPS_REQUEST'],
]) {
  test(`the built ops answers ${name} as src/ops.mjs does`, () => {
    const want = runOps(srcOps, input);
    const got = runOps(builtOps, input);
    assert.equal(want.status, 0, want.stderr);
    assert.equal(got.status, 0, got.stderr);
    assert.equal(got.stdout, want.stdout);
  });
}
