// A second server for the end-to-end tests, running the same build as the
// first but with a database it can't reach, so use_case_storage_unavailable
// sees every store call fail the way it would in production. Its database
// URL stays on this machine; only the port differs.
// The config imports this file, so its imports are relative.
import { databaseUrlEnvironment, readEndToEndPort } from "../src/env.ts";

// Clear of the other worktrees' E2E_PORTs and of the test database's 4444.
const STORAGE_DOWN_PORT_OFFSET = 1000;

// fetch() refuses port 1 outright (the Fetch standard lists it as a bad
// port), so the database driver fails at once, as when Neon can't be
// reached, and nothing on this machine can ever answer there.
const DEAD_DATABASE_PORT = 1;

function storageDownPort(): number {
  return readEndToEndPort() + STORAGE_DOWN_PORT_OFFSET;
}

// The address of path on the server whose database is down.
function storageDownUrl(path: string): string {
  return new URL(path, `http://localhost:${storageDownPort()}`).href;
}

// The environment the server whose database is down runs with, on top of
// the test environment: the test database's URL, pointed at the dead port.
function storageDownEnvironment(
  testDatabaseUrl: string,
): Readonly<Record<string, string>> {
  const url = new URL(testDatabaseUrl);
  url.port = String(DEAD_DATABASE_PORT);
  return databaseUrlEnvironment(url.href);
}

export { storageDownEnvironment, storageDownPort, storageDownUrl };
