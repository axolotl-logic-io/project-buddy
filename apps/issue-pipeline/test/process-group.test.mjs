// @ts-check
// Ending a child's process group (src/process-group.ts): a child that runs
// has its group signalled; one that has exited gets no signal, since once it
// is reaped its pid, the group's id, is free for another process's group.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";
import { test } from "node:test";
import { endLeaderGroup } from "../src/process-group.ts";
import { endsWithTest, killGroup } from "./bounded-test-kit.mjs";

// The grace endLeaderGroup gives a child after its SIGTERM.
const GRACE_MS = 5000;

/**
 * A child running `code` in a group of its own, killed when the test ends.
 * @param {string} code
 */
function leader(code) {
  const child = spawn(process.execPath, ["-e", code], {
    stdio: "ignore",
    detached: true,
  });
  endsWithTest(() => {
    const { pid } = child;
    if (
      pid !== undefined &&
      child.exitCode === null &&
      child.signalCode === null
    ) {
      killGroup(pid);
    }
  });
  return child;
}

test("a running child's group gets SIGTERM, and the child ends", async () => {
  const child = leader("setInterval(() => {}, 60_000);");
  await once(child, "spawn");
  const signals = await endLeaderGroup(child, GRACE_MS);
  assert.deepEqual(signals, ["SIGTERM"]);
  assert.equal(child.signalCode, "SIGTERM");
});

test("a child that has exited gets no signal to its group", async () => {
  const child = leader("");
  await once(child, "exit");
  const signals = await endLeaderGroup(child, GRACE_MS);
  assert.deepEqual(signals, []);
});
