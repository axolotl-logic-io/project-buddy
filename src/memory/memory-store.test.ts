// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { projectIdFixture, userIdFixture } from "@/id-fixtures.ts";
import {
  MEMORY_VERSION_NUMBER,
  type MemoryVersionNumber,
} from "@/memory/memory.ts";
import {
  editMemory,
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const ROW_ID = "5f0c8a52-3c1d-4e6f-8a9b-1c2d3e4f5a6b";
const CREATED_AT = "2026-10-11 09:00:00+00";
// The version a write is based on, and the one it saves.
const THIRD = 3;
const BASED_ON = MEMORY_VERSION_NUMBER.parse(THIRD);
const NEXT = String(BASED_ON + 1);
const EARLIER = MEMORY_VERSION_NUMBER.parse(1);
const NOTHING_SAVED = MEMORY_VERSION_NUMBER.parse(0);
// Each refused attempt at an edit reads, inserts and reads the newer memory.
const QUERIES_PER_REFUSED_EDIT = 3;
const EDIT_ATTEMPTS = 5;

const NEWEST_FIRST = /order by "memory_versions"\."version" desc$/u;
const NEWEST_ONLY = /order by "memory_versions"\."version" desc limit \$\d+$/u;
const INSERT_SELECT = /^insert into "memory_versions" .* select /u;
// The project's newest version, and the check that makes a write
// conditional on it being the version the write was based on.
const NEWEST =
  /\(select coalesce\(max\("version"\), 0\) as "newest_version", .* from "memory_versions" where "memory_versions"\."project_id" = \$\d+\) "newest"/u;
const BASED_ON_NEWEST = /"newest_version" = \$\d+/u;
// The check that saves no version for the text the newest already has.
const TEXT_CHANGED = /"newest_text" <> \$\d+/u;
const ANY_CONFLICT_SAVES_NOTHING = /on conflict do nothing returning/u;
const RESTORED_TEXT =
  /select gen_random_uuid\(\), \$\d+::uuid, \$\d+::integer \+ 1, "memory_versions"\."text", .* and "memory_versions"\."version" = \$\d+\)/u;

// The database answers every query with these memory versions, each as
// [version, text, author].
function storedVersions(
  rows: readonly (readonly [string, string, string])[],
): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [
      { name: "id", type: "text" },
      { name: "project_id", type: "text" },
      { name: "version", type: "int4" },
      { name: "text", type: "text" },
      { name: "author", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
    rows: rows.map(([version, text, author]) => [
      ROW_ID,
      PROJECT_ID,
      version,
      text,
      author,
      CREATED_AT,
    ]),
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

function saveMine(basedOn: MemoryVersionNumber): Promise<unknown> {
  return saveMemory(OWNER, {
    projectId: PROJECT_ID,
    text: "Mine",
    basedOn,
    author: "user",
  });
}

function restoreEarlier(basedOn: MemoryVersionNumber): Promise<unknown> {
  return restoreMemoryVersion(OWNER, {
    projectId: PROJECT_ID,
    version: EARLIER,
    basedOn,
    author: "user",
  });
}

function markRiggingDone(): Promise<unknown> {
  return editMemory(OWNER, {
    projectId: PROJECT_ID,
    edit: { oldText: "- Rig it", newText: "- Rig it (done)" },
    author: "tutor",
  });
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("memory store reads", () => {
  test("readMemory reads the project's newest version", async () => {
    const database = storedVersions([["3", "# Goals", "tutor"]]);

    await expect(readMemory(OWNER, PROJECT_ID)).resolves.toEqual({
      text: "# Goals",
      version: 3,
    });
    expect(database.queries[0]?.query).toMatch(NEWEST_ONLY);
    expect(database.queries[0]?.params).toContain(PROJECT_ID);
  });

  test("readMemory reads a project with nothing saved as empty", async () => {
    storedVersions([]);

    await expect(readMemory(OWNER, PROJECT_ID)).resolves.toEqual({
      text: "",
      version: 0,
    });
  });

  test("readMemoryHistory lists every version newest first, with author and time", async () => {
    const database = storedVersions([
      ["2", "B", "tutor"],
      ["1", "A", "user"],
      ["0", "skipped: no version 0 is stored", "user"],
      ["1", "skipped: unknown author", "someone"],
    ]);
    const createdAt = new Date(CREATED_AT);

    await expect(readMemoryHistory(OWNER, PROJECT_ID)).resolves.toEqual([
      { version: 2, text: "B", author: "tutor", createdAt },
      { version: 1, text: "A", author: "user", createdAt },
    ]);
    expect(database.queries[0]?.query).toMatch(NEWEST_FIRST);
  });
});

describe("memory store saves", () => {
  test("saveMemory inserts the next version only if basedOn is the newest", async () => {
    const database = storedVersions([[NEXT, "Mine", "user"]]);

    await expect(saveMine(BASED_ON)).resolves.toEqual({
      kind: "saved",
      memory: { text: "Mine", version: BASED_ON + 1 },
    });
    const [insert] = database.queries;
    expect(insert?.query).toMatch(INSERT_SELECT);
    expect(insert?.query).toMatch(NEWEST);
    expect(insert?.query).toMatch(BASED_ON_NEWEST);
    expect(insert?.query).toMatch(TEXT_CHANGED);
    expect(insert?.query).toMatch(ANY_CONFLICT_SAVES_NOTHING);
    // The driver sends every parameter as text.
    expect(insert?.params).toEqual(
      expect.arrayContaining([PROJECT_ID, String(BASED_ON), "Mine", "user"]),
    );
  });

  test("saveMemory refuses an outdated save and returns the newest memory", async () => {
    const database = storedVersions([]);

    await expect(saveMine(BASED_ON)).resolves.toEqual({
      kind: "outdated",
      memory: { text: "", version: 0 },
    });
    expect(database.queries).toHaveLength(2);
  });

  test("saveMemory saves no version for the text it was based on, and returns the memory", async () => {
    const database = storedVersions([]);

    await expect(
      saveMemory(OWNER, {
        projectId: PROJECT_ID,
        text: "",
        basedOn: NOTHING_SAVED,
        author: "user",
      }),
    ).resolves.toEqual({ kind: "saved", memory: { text: "", version: 0 } });
    expect(database.queries[0]?.query).toMatch(TEXT_CHANGED);
    expect(database.queries[0]?.params).toContain("");
  });
});

describe("memory store restores", () => {
  test("restoreMemoryVersion copies the version's text as the next version", async () => {
    const database = storedVersions([[NEXT, "Old", "user"]]);

    await expect(restoreEarlier(BASED_ON)).resolves.toEqual({
      kind: "saved",
      memory: { text: "Old", version: BASED_ON + 1 },
    });
    expect(database.queries[0]?.query).toMatch(RESTORED_TEXT);
    expect(database.queries[0]?.query).toMatch(NEWEST);
    expect(database.queries[0]?.query).toMatch(BASED_ON_NEWEST);
    expect(database.queries[0]?.query).not.toMatch(TEXT_CHANGED);
  });

  test("restoreMemoryVersion refuses an outdated restore", async () => {
    storedVersions([]);

    await expect(restoreEarlier(BASED_ON)).resolves.toEqual({
      kind: "outdated",
      memory: { text: "", version: 0 },
    });
  });

  test("restoreMemoryVersion finds no version the project lacks", async () => {
    storedVersions([]);

    await expect(restoreEarlier(NOTHING_SAVED)).resolves.toBeUndefined();
  });
});

describe("memory store edits", () => {
  test("editMemory saves the edit on top of the newest version", async () => {
    const database = storedVersions([["2", "- Rig it", "tutor"]]);

    await expect(markRiggingDone()).resolves.toEqual({
      kind: "saved",
      memory: { text: "- Rig it", version: 2 },
    });
    expect(database.queries[1]?.params).toEqual(
      expect.arrayContaining(["2", "- Rig it (done)", "tutor"]),
    );
  });

  test("editMemory fails without writing when the edit does not apply", async () => {
    const database = storedVersions([["2", "- Texture it", "user"]]);

    await expect(markRiggingDone()).resolves.toEqual({
      kind: "failed",
      reason: "missing",
      memory: { text: "- Texture it", version: 2 },
    });
    expect(database.queries).toHaveLength(1);
  });

  test("editMemory tries again on each newer version, then gives up with a logged AppError", async () => {
    const database = storedVersions([]);
    const log = spyOnErrorLog();

    const error = await editMemory(OWNER, {
      projectId: PROJECT_ID,
      edit: { oldText: "", newText: "Prefers shortcuts." },
      author: "tutor",
    }).catch((caught: unknown) => caught);

    expect(error).toHaveProperty("errorCase", "unknown");
    expect(database.queries).toHaveLength(
      EDIT_ATTEMPTS * QUERIES_PER_REFUSED_EDIT,
    );
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe("memory store failures", () => {
  test.each([
    ["readMemory", (): Promise<unknown> => readMemory(OWNER, PROJECT_ID)],
    [
      "readMemoryHistory",
      (): Promise<unknown> => readMemoryHistory(OWNER, PROJECT_ID),
    ],
    ["saveMemory", (): Promise<unknown> => saveMine(BASED_ON)],
    ["restoreMemoryVersion", (): Promise<unknown> => restoreEarlier(BASED_ON)],
  ])(
    "%s rejects with a logged AppError when the database is unreachable",
    async (operation, call) => {
      vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
      const log = spyOnErrorLog();

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toHaveProperty("errorCase", "database-unreachable");
      expect(log).toHaveBeenCalledWith(
        `[app-error] database-unreachable in ${operation}`,
        expect.any(String),
      );
    },
  );
});
