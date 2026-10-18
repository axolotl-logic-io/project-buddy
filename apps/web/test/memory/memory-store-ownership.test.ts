// @vitest-environment node
import type { SQL } from "drizzle-orm";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { memoryVersionOwnedBy, ownsProject } from "@/accounts/owner-scope.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  editMemory,
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";
import { holdsPredicate } from "../accounts/owner-scope-test-kit.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "../db/fake-neon-http.ts";
import { projectIdFixture, userIdFixture } from "../id-fixtures.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const BASED_ON = MEMORY_VERSION_NUMBER.parse(2);

// The database, which holds no versions: another user's project reads as
// one with nothing saved.
let neonHttp: FakeNeonHttp = fakeNeonHttp({
  kind: "rows",
  columns: [],
  rows: [],
});

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  neonHttp = fakeNeonHttp({ kind: "rows", columns: [], rows: [] });
  vi.stubGlobal("fetch", neonHttp.fetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Each memory store function, called for OWNER, with the predicate that
// scopes its first query to OWNER's projects.
const calls: [string, () => Promise<unknown>, SQL][] = [
  [
    "readMemory",
    (): Promise<unknown> => readMemory(OWNER, PROJECT_ID),
    memoryVersionOwnedBy(OWNER),
  ],
  [
    "readMemoryHistory",
    (): Promise<unknown> => readMemoryHistory(OWNER, PROJECT_ID),
    memoryVersionOwnedBy(OWNER),
  ],
  [
    "saveMemory",
    (): Promise<unknown> =>
      saveMemory(OWNER, {
        projectId: PROJECT_ID,
        text: "Mine",
        basedOn: BASED_ON,
        author: "user",
      }),
    ownsProject(OWNER, PROJECT_ID),
  ],
  [
    "restoreMemoryVersion",
    (): Promise<unknown> =>
      restoreMemoryVersion(OWNER, {
        projectId: PROJECT_ID,
        version: MEMORY_VERSION_NUMBER.parse(1),
        basedOn: BASED_ON,
        author: "user",
      }),
    ownsProject(OWNER, PROJECT_ID),
  ],
  [
    "editMemory",
    (): Promise<unknown> =>
      editMemory(OWNER, {
        projectId: PROJECT_ID,
        edit: { oldText: "", newText: "Prefers shortcuts." },
        author: "tutor",
      }),
    memoryVersionOwnedBy(OWNER),
  ],
];

test.each(calls)(
  "%s reads or writes only the owner's memory",
  async (_operation, call, predicate) => {
    await call().catch(() => undefined);

    expect(holdsPredicate(neonHttp.queries[0], predicate)).toBe(true);
  },
);
