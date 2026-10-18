// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { editMemory } from "@/memory/memory-store.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { projectIdFixture, userIdFixture } from "../id-fixtures.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const ROW_ID = "5f0c8a52-3c1d-4e6f-8a9b-1c2d3e4f5a6b";
const CREATED_AT = "2026-10-11 09:00:00+00";
// Each refused attempt at an edit reads, inserts and reads the newer memory.
const QUERIES_PER_REFUSED_EDIT = 3;
const EDIT_ATTEMPTS = 5;

const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };

// The answer to a read of memory versions: these, each as
// [version, text, author].
function versionRows(
  rows: readonly (readonly [string, string, string])[],
): NeonHttpAnswer {
  return {
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
  };
}

// The database answers every query with these memory versions, each as
// [version, text, author].
function storedVersions(
  rows: readonly (readonly [string, string, string])[],
): FakeNeonHttp {
  const neonHttp = fakeNeonHttp(versionRows(rows));
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

// A database where another write lands during every edit: each attempt
// reads a version, saves nothing, and then reads a newer one.
function newerVersionEachSave(): FakeNeonHttp {
  const answers = Array.from({ length: EDIT_ATTEMPTS }, (_, attempt) => [
    versionRows([[String(attempt + 1), "Theirs", "user"]]),
    NO_ROWS,
    versionRows([[String(attempt + 2), "Theirs", "user"]]),
  ]).flat();
  const [first = NO_ROWS, ...later] = answers;
  const neonHttp = fakeNeonHttp(first, ...later);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

function markRiggingDone(): Promise<unknown> {
  return editMemory(OWNER, {
    projectId: PROJECT_ID,
    edit: { oldText: "- Rig it", newText: "- Rig it (done)" },
    author: "tutor",
  });
}

function addShortcutsNote(): Promise<unknown> {
  return editMemory(OWNER, {
    projectId: PROJECT_ID,
    edit: { oldText: "", newText: "Prefers shortcuts." },
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

  test("editMemory finds an unknown or foreign project nowhere, after one attempt", async () => {
    const database = storedVersions([]);
    const log = spyOnErrorLog();

    await expect(addShortcutsNote()).resolves.toBeUndefined();
    expect(database.queries).toHaveLength(QUERIES_PER_REFUSED_EDIT);
    expect(log).not.toHaveBeenCalled();
  });

  test("editMemory tries again on each newer version, then gives up with a logged AppError", async () => {
    const database = newerVersionEachSave();
    const log = spyOnErrorLog();

    const error = await addShortcutsNote().catch((caught: unknown) => caught);

    expect(error).toHaveProperty("errorCase", "unknown");
    expect(database.queries).toHaveLength(
      EDIT_ATTEMPTS * QUERIES_PER_REFUSED_EDIT,
    );
    expect(log).toHaveBeenCalledTimes(1);
  });
});
