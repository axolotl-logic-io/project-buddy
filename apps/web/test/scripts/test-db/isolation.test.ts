// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { findFreePort } from "../../../scripts/test-db/run-environment.ts";
import { secondCheckout, startRun } from "./run-cli-test-kit.ts";

const TEST_TIMEOUT_MS = 40_000;
const url = new URL("postgres://localhost:4444/pinned_run");
url.username = "app";
url.password = "placeholder";
beforeEach(() => {
  vi.stubEnv("TUTOR_MODEL", "mock");
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_OUTBOX_DIR", "test-results/email-outbox");
});
afterEach(() => vi.unstubAllEnvs());

test(
  "simultaneous script checkouts do not reset each other's live allocation",
  async () => {
    const cwd = await secondCheckout();
    const first = await startRun("hold");
    const one = await first.milestone("ready");
    const second = await startRun("hold", { cwd });
    const two = await second.milestone("ready");
    expect(one.database).not.toBe(two.database);
    expect(one.port).not.toBe(two.port);
    expect(await first.files()).toContain(`${one.database}.db`);
    first.child.kill("SIGTERM");
    expect(await first.done, first.output()).not.toBe(0);
    expect(await second.files()).toContain(`${two.database}.db`);
    second.child.kill("SIGTERM");
    expect(await second.done, second.output()).not.toBe(0);
  },
  TEST_TIMEOUT_MS,
);

test(
  "a real Chromium launch preserves its extra stdio pipes and closes its owned group",
  async () => {
    const run = await startRun("browser");
    await run.milestone("browser-done");
    expect(await run.done, run.output()).toBe(0);
  },
  TEST_TIMEOUT_MS,
);

test(
  "an explicitly named database is migrated and kept",
  async () => {
    const run = await startRun("pass", { databaseUrl: url.href });
    const ready = await run.milestone("ready");
    expect(await run.done, run.output()).toBe(0);
    expect(ready.database).toBe("pinned_run");
    expect(await run.files()).toContain("pinned_run.db");
    expect(await run.files()).toContain("pinned_run.migrated");
  },
  TEST_TIMEOUT_MS,
);

test(
  "test-file settings apply when the environment omits them",
  async () => {
    const filePort = await findFreePort();
    const run = await startRun("pass", {
      fileSettings: `DATABASE_URL=${url.href}\nE2E_PORT=${filePort}\n`,
    });
    const ready = await run.milestone("ready");
    expect(await run.done, run.output()).toBe(0);
    expect(ready.database).toBe("pinned_run");
    expect(ready.port).toBe(filePort);
  },
  TEST_TIMEOUT_MS,
);

test(
  "environment settings override independently supplied test-file settings",
  async () => {
    const filePort = await findFreePort();
    const environmentPort = await findFreePort();
    const other = new URL(url.href);
    other.pathname = "/environment_run";
    const run = await startRun("pass", {
      fileSettings: `DATABASE_URL=${url.href}\nE2E_PORT=${filePort}\n`,
      databaseUrl: other.href,
      port: environmentPort,
    });
    const ready = await run.milestone("ready");
    expect(await run.done, run.output()).toBe(0);
    expect(ready.database).toBe("environment_run");
    expect(ready.port).toBe(environmentPort);
  },
  TEST_TIMEOUT_MS,
);
