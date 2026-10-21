// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AppError } from "@/errors/app-error.ts";
import {
  MEMORY_VERSION_NUMBER,
  type MemoryVersionNumber,
} from "@/memory/memory.ts";
import {
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { projectIdFixture, userIdFixture } from "../id-fixtures.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const ROW_ID = "5f0c8a52-3c1d-4e6f-8a9b-1c2d3e4f5a6b";
const CREATED_AT = "2026-10-11 09:00:00+00";
// The version a write is based on, and the one it saves.
const THIRD = 3;
const BASED_ON = MEMORY_VERSION_NUMBER.parse(THIRD);
const EARLIER = MEMORY_VERSION_NUMBER.parse(1);

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

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("memory store reads", () => {
  test("readMemoryHistory skips malformed version or author rows", async () => {
    storedVersions([
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
