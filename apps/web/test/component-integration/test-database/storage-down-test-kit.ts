// For server tests of use_case_storage_unavailable: the test database's
// address, pointed at a port where nothing can answer, so every query fails
// at once the way it does when Neon can't be reached. getDb() keeps the
// client it makes first, so a test file calls stubStorageDown before any
// query runs, and reads the working database afterwards through a fresh
// module graph (restoreStorage).
import { vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { readDatabaseUrl } from "@/env.ts";
import { userIdFixture } from "../../support/id-fixtures.ts";

// fetch() refuses port 1 outright (the Fetch standard lists it as a bad
// port), and nothing on this machine can ever answer there.
const DEAD_DATABASE_PORT = 1;

// Points DATABASE_URL at the dead port, for every database client made
// from now on in this test file.
function stubStorageDown(): void {
  const url = new URL(readDatabaseUrl());
  url.port = String(DEAD_DATABASE_PORT);
  vi.stubEnv("DATABASE_URL", url.href);
}

// Points DATABASE_URL back at the test database and forgets every module,
// so a module imported after this makes a new client that reaches it.
function restoreStorage(): void {
  vi.unstubAllEnvs();
  vi.resetModules();
}

// A user who was never stored, since nothing can be stored while the
// storage is down. A session for them is signed like any other, without
// the database.
function unstoredUser(): User {
  return {
    id: userIdFixture(),
    email: `storage-down-${crypto.randomUUID()}@example.test`,
    role: "user",
    sessionEpoch: 0,
    hiddenExtras: [],
    name: undefined,
  };
}

export { restoreStorage, stubStorageDown, unstoredUser };
