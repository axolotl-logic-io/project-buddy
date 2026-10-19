// These tests run only behind the real local-server environment guard, never
// in the unit project. No missing-environment skip can masquerade as evidence.
import { expect, test } from "vitest";
import { runWithTestDatabase } from "../../../scripts/test-db/run-environment.ts";
import {
  checkTestDatabase,
  checkTestEnvironment,
  dropTestDatabase,
  listServerDatabases,
} from "../../../scripts/test-db/test-database.ts";
import { secondCheckout, startRun } from "./run-cli-test-kit.ts";

import { ownedProcessesEnded } from "./run-recovery-test-kit.ts";

function serverUrl(): string {
  const url = new URL(checkTestEnvironment().url);
  url.pathname = "/";
  return url.href;
}
function namedDatabase(name: string): ReturnType<typeof checkTestDatabase> {
  const url = new URL(serverUrl());
  url.pathname = `/${name}`;
  return checkTestDatabase(url.href);
}
test("recovers a proven-abandoned allocation and its scratch database, idempotently", async () => {
  const abandoned = await startRun("hold", {
    real: true,
    databaseUrl: serverUrl(),
    extra: ["--scratch"],
  });
  const ready = await abandoned.milestone("ready");
  const own = namedDatabase(ready.database);
  const scratch = namedDatabase(`${ready.database}_scratch`);
  try {
    expect(await listServerDatabases(own)).toContain(scratch.name);
    abandoned.child.kill("SIGKILL");
    expect(await abandoned.done).not.toBe(0);
    await ownedProcessesEnded(own.name);
    await runWithTestDatabase({ databaseUrl: serverUrl() }, () =>
      Promise.resolve(0),
    );
    expect(await listServerDatabases(own)).not.toContain(own.name);
    expect(await listServerDatabases(own)).not.toContain(scratch.name);
    await runWithTestDatabase({ databaseUrl: serverUrl() }, () =>
      Promise.resolve(0),
    );
    expect(await listServerDatabases(own)).not.toContain(scratch.name);
  } finally {
    await dropTestDatabase(scratch);
    await dropTestDatabase(own);
  }
});
test("simultaneous real checkout allocations migrate and keep active scratch databases isolated", async () => {
  const cwd = await secondCheckout();
  const first = await startRun("hold", {
    real: true,
    databaseUrl: serverUrl(),
    extra: ["--scratch"],
  });
  const one = await first.milestone("ready");
  const second = await startRun("hold", {
    real: true,
    cwd,
    databaseUrl: serverUrl(),
    extra: ["--scratch"],
  });
  const two = await second.milestone("ready");
  expect(one.database).not.toBe(two.database);
  expect(one.port).not.toBe(two.port);
  expect(await listServerDatabases(namedDatabase(one.database))).toContain(
    `${one.database}_scratch`,
  );
  first.child.kill("SIGTERM");
  expect(await first.done, first.output()).not.toBe(0);
  const names = await listServerDatabases(namedDatabase(two.database));
  expect(names).not.toContain(one.database);
  expect(names).not.toContain(`${one.database}_scratch`);
  expect(names).toContain(two.database);
  expect(names).toContain(`${two.database}_scratch`);
  second.child.kill("SIGTERM");
  expect(await second.done, second.output()).not.toBe(0);
  expect(await listServerDatabases(namedDatabase(two.database))).not.toContain(
    `${two.database}_scratch`,
  );
});
