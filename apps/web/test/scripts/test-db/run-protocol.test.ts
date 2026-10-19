// @vitest-environment node
import { expect, test, vi } from "vitest";
import { awaitCommandShutdown } from "../../../scripts/test-db/run-protocol.ts";

const COMMAND_FAILURE = 3;
const CLEANUP_FAILURE = new Error("Known owned process could not be stopped.");

function pendingCommand(): Promise<number> {
  return new Promise(() => {
    /* Models a direct child that cannot exit despite shutdown requests. */
  });
}

test("reports failed shutdown without waiting forever for direct child exit", async () => {
  const controller = new AbortController();
  const stop = vi.fn(() => Promise.reject(CLEANUP_FAILURE));
  const done = awaitCommandShutdown(pendingCommand(), controller.signal, stop);
  controller.abort();
  await expect(done).rejects.toBe(CLEANUP_FAILURE);
  expect(stop).toHaveBeenCalledOnce();
});

test("successful shutdown settles an interrupted pending command as failure", async () => {
  const controller = new AbortController();
  const stop = vi.fn(() => Promise.resolve());
  const done = awaitCommandShutdown(pendingCommand(), controller.signal, stop);
  controller.abort();
  expect(await done).not.toBe(0);
  expect(stop).toHaveBeenCalledOnce();
});

test("an already handled stop still observes shutdown failure", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    awaitCommandShutdown(pendingCommand(), controller.signal, () =>
      Promise.reject(CLEANUP_FAILURE),
    ),
  ).rejects.toBe(CLEANUP_FAILURE);
});

test("ordinary completion preserves status and releases the stop listener", async () => {
  const controller = new AbortController();
  const stop = vi.fn(() => Promise.resolve());
  expect(
    await awaitCommandShutdown(
      Promise.resolve(COMMAND_FAILURE),
      controller.signal,
      stop,
    ),
  ).toBe(COMMAND_FAILURE);
  controller.abort();
  await Promise.resolve();
  expect(stop).not.toHaveBeenCalled();
});
