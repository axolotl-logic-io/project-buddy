// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { competitor, startRun } from "./run-cli-test-kit.ts";

const TEST_TIMEOUT_MS = 40_000;
const FAILED_STATUS = 3;
const STOP_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
const UNAVAILABLE = /port .*unavailable|EADDRINUSE/u;
beforeEach(() => {
  vi.stubEnv("TUTOR_MODEL", "mock");
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_OUTBOX_DIR", "test-results/email-outbox");
});
afterEach(() => vi.unstubAllEnvs());

test(
  "observes readiness even when the child completed its milestone before the wait",
  async () => {
    const run = await startRun("already-ready");
    const ready = await run.milestone("observed-ready");
    expect(await run.done, run.output()).toBe(0);
    expect(await run.files()).toContain(`${ready.database}.dropped`);
  },
  TEST_TIMEOUT_MS,
);

describe("supported invocation lifecycle", () => {
  test(
    "drops a migrated generated database after successful execution",
    async () => {
      const run = await startRun("pass");
      const ready = await run.milestone("ready");
      expect(await run.done, run.output()).toBe(0);
      const files = await run.files();
      expect(files).toContain(`${ready.database}.migrated`);
      expect(files).toContain(`${ready.database}.dropped`);
      expect(files).not.toContain(`${ready.database}.db`);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "preserves command failure while completing database cleanup",
    async () => {
      const run = await startRun("fail");
      const ready = await run.milestone("ready");
      expect(await run.done, run.output()).toBe(FAILED_STATUS);
      expect(await run.files()).toContain(`${ready.database}.dropped`);
    },
    TEST_TIMEOUT_MS,
  );

  test.each(STOP_SIGNALS)(
    "handles %s cooperatively before dropping its database",
    async (signal) => {
      const run = await startRun("hold");
      const ready = await run.milestone("ready");
      run.child.kill(signal);
      expect(await run.done, run.output()).not.toBe(0);
      expect(await run.files()).toContain("stopped");
      expect(await run.files()).toContain(`${ready.database}.dropped`);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "cleans ordinary detached groups left after their direct parent exits",
    async () => {
      const run = await startRun("detached");
      const ready = await run.milestone("ready");
      await run.milestone("parent-exited");
      expect(await run.done, run.output()).toBe(0);
      expect(await run.files()).toContain("stopped");
      expect(await run.files()).toContain(`${ready.database}.dropped`);
    },
    TEST_TIMEOUT_MS,
  );
});

describe("failure and escalation cleanup", () => {
  test(
    "bounds escalation for a group that ignores cooperative termination",
    async () => {
      const run = await startRun("stubborn");
      const ready = await run.milestone("ready");
      run.child.kill("SIGTERM");
      expect(await run.done, run.output()).not.toBe(0);
      expect(await run.files()).toContain(`${ready.database}.dropped`);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "cleans database allocation if migration fails before the command",
    async () => {
      const run = await startRun("pass", { extra: ["--migration-fails"] });
      expect(await run.done, run.output()).not.toBe(0);
      const files = await run.files();
      expect(files.some((file) => file.endsWith(".dropped"))).toBe(true);
      expect(files).not.toContain("ready");
    },
    TEST_TIMEOUT_MS,
  );
});

describe("owned port and per-invocation resources", () => {
  test(
    "simultaneous same-checkout allocations stay independent",
    async () => {
      const first = await startRun("hold");
      const firstReady = await first.milestone("ready");
      const second = await startRun("hold");
      const secondReady = await second.milestone("ready");
      expect(firstReady.database).not.toBe(secondReady.database);
      expect(firstReady.port).not.toBe(secondReady.port);
      first.child.kill("SIGTERM");
      expect(await first.done, first.output()).not.toBe(0);
      expect(await second.files()).not.toContain(
        `${secondReady.database}.dropped`,
      );
      second.child.kill("SIGTERM");
      expect(await second.done, second.output()).not.toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "refuses an occupied explicit port without signalling its owner",
    async () => {
      const server = await competitor(0);
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("Missing competitor port.");
      }
      const run = await startRun("pass", { port: address.port });
      expect(await run.done, run.output()).not.toBe(0);
      expect(run.output()).toMatch(UNAVAILABLE);
      expect(server.listening).toBe(true);
      expect(await run.files()).not.toContain("ready");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "a competing bind after release never becomes the ready site",
    async () => {
      const run = await startRun("race");
      const selected = await run.milestone("released");
      const server = await competitor(selected.port, run.directory);
      expect(await run.done, run.output()).not.toBe(0);
      expect(run.output()).toMatch(UNAVAILABLE);
      expect(await run.files()).not.toContain("tests-ran");
      expect(await run.files()).toContain(`${selected.database}.dropped`);
      expect(server.listening).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );
});

test(
  "command spawn failure drops the generated database without starting tests",
  async () => {
    const run = await startRun("pass", { command: "/pb-test/no-such-command" });
    expect(await run.done, run.output()).not.toBe(0);
    const files = await run.files();
    expect(files.some((name) => name.endsWith(".dropped"))).toBe(true);
    expect(files).not.toContain("ready");
  },
  TEST_TIMEOUT_MS,
);

test(
  "unsupported platforms fail before any allocation or test execution",
  async () => {
    const run = await startRun("pass", { extra: ["--unsupported-platform"] });
    expect(await run.done, run.output()).not.toBe(0);
    expect(run.output()).toContain("Unsupported test wrapper platform");
    expect(await run.files()).toEqual([]);
  },
  TEST_TIMEOUT_MS,
);
