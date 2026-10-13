// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { holdsPredicate } from "@/accounts/owner-scope-test-kit.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { chatIdFixture, userIdFixture } from "@/id-fixtures.ts";
import { createProject, getProject, listProjects } from "@/projects/store.ts";

const OWNER = userIdFixture();
const PROJECT_ID = "0b6f5c1e-4d2a-4f7b-9c3e-1a2b3c4d5e6f";
const CREATED_AT = "2026-10-11 09:00:00+00";

const calls: [string, () => Promise<unknown>][] = [
  ["listProjects", (): Promise<unknown> => listProjects(OWNER)],
  ["getProject", (): Promise<unknown> => getProject(OWNER, PROJECT_ID)],
  [
    "createProject",
    (): Promise<unknown> => createProject(OWNER, "Low-poly fox"),
  ],
];

// The database answers every query with these rows of OWNER's projects,
// each as its id, name and creation time.
function storedProjects(rows: readonly (readonly string[])[]): FakeNeonHttp {
  const answer: NeonHttpAnswer = {
    kind: "rows",
    columns: [
      { name: "id", type: "text" },
      { name: "user_id", type: "text" },
      { name: "name", type: "text" },
      { name: "interview_chat_id", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
    rows: rows.map(
      ([id = "", name = "", createdAt = "", interviewChatId = null]) => [
        id,
        OWNER,
        name,
        interviewChatId,
        createdAt,
      ],
    ),
  };
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("project store failures", () => {
  test.each(calls)(
    "%s rejects with a logged AppError when Postgres rejects the query",
    async (operation, call) => {
      vi.stubGlobal(
        "fetch",
        fakeNeonHttp({
          kind: "postgres-error",
          code: "42P01",
          message: 'relation "projects" does not exist',
        }).fetch,
      );
      const log = spyOnErrorLog();

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toHaveProperty("errorCase", "database-query-failed");
      expect(log).toHaveBeenCalledWith(
        `[app-error] database-query-failed in ${operation}`,
        expect.any(String),
      );
    },
  );
});

describe("project store reads", () => {
  test("getProject finds a malformed id nowhere, without a query", async () => {
    const neonHttp = storedProjects([[PROJECT_ID, "Fox", CREATED_AT]]);

    expect(await getProject(OWNER, "not-a-uuid")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });

  test("getProject looks up the lowercase id among the owner's projects", async () => {
    const neonHttp = storedProjects([[PROJECT_ID, "Fox", CREATED_AT]]);

    expect(await getProject(OWNER, PROJECT_ID.toUpperCase())).toEqual({
      id: PROJECT_ID,
      name: "Fox",
      createdAt: new Date(CREATED_AT),
    });
    expect(neonHttp.queries[0]?.params).toEqual([PROJECT_ID, OWNER]);
    expect(holdsPredicate(neonHttp.queries[0], projectOwnedBy(OWNER))).toBe(
      true,
    );
  });

  test("getProject reads the project's interview chat", async () => {
    const interviewChatId = chatIdFixture();
    storedProjects([[PROJECT_ID, "Fox", CREATED_AT, interviewChatId]]);

    expect(await getProject(OWNER, PROJECT_ID)).toHaveProperty(
      "interviewChatId",
      interviewChatId,
    );
  });

  test("getProject returns undefined for an unknown or foreign id", async () => {
    storedProjects([]);

    expect(await getProject(OWNER, PROJECT_ID)).toBeUndefined();
  });

  test("listProjects reads only the owner's projects", async () => {
    const neonHttp = storedProjects([]);

    await listProjects(OWNER);

    expect(holdsPredicate(neonHttp.queries[0], projectOwnedBy(OWNER))).toBe(
      true,
    );
  });

  test("listProjects skips a row whose id is not a UUID", async () => {
    storedProjects([
      ["not-a-uuid", "Broken", CREATED_AT],
      [PROJECT_ID, "Fox", CREATED_AT],
    ]);

    expect(await listProjects(OWNER)).toEqual([
      { id: PROJECT_ID, name: "Fox", createdAt: new Date(CREATED_AT) },
    ]);
  });
});

describe("project store createProject", () => {
  test("createProject saves the project as the owner's and returns it", async () => {
    const neonHttp = storedProjects([[PROJECT_ID, "Fox", CREATED_AT]]);

    expect(await createProject(OWNER, "Fox")).toEqual({
      id: PROJECT_ID,
      name: "Fox",
      createdAt: new Date(CREATED_AT),
    });
    expect(neonHttp.queries[0]?.params).toEqual([OWNER, "Fox"]);
  });

  test("createProject rejects with a logged AppError when no project comes back", async () => {
    storedProjects([["not-a-uuid", "Fox", CREATED_AT]]);
    const log = spyOnErrorLog();

    const error = await createProject(OWNER, "Fox").catch(
      (caught: unknown) => caught,
    );

    expect(error).toHaveProperty("errorCase", "unknown");
    expect(log).toHaveBeenCalledWith(
      "[app-error] unknown in createProject",
      expect.any(String),
    );
  });
});
