// @vitest-environment node
// The user store's rows read as users, and its failures. Which rows its
// queries find is users-store.server.test.ts's.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  endEverySession,
  findUserByEmail,
  normalizeEmail,
  readSessionUser,
  readUserName,
  saveHiddenExtras,
  saveUserName,
  type User,
} from "@/accounts/users-store.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { userIdFixture } from "../id-fixtures.ts";

const USER_ID = userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f");
const EMAIL = "mabel@example.test";
const CREATED_AT = "2026-10-12 09:00:00+00";
const MABEL: User = {
  id: USER_ID,
  email: EMAIL,
  role: "user",
  sessionEpoch: 2,
  hiddenExtras: ["working-note"],
  name: "Mabel",
};

// The database answers every query with these user rows.
function storedUsers(
  rows: readonly (readonly (string | null)[])[],
): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [
      { name: "id", type: "text" },
      { name: "email", type: "text" },
      { name: "session_epoch", type: "int4" },
      { name: "hidden_extras", type: "_text" },
      { name: "name", type: "text" },
      { name: "created_at", type: "timestamptz" },
    ],
    rows,
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

const MABEL_ROW: readonly string[] = [
  USER_ID,
  EMAIL,
  "2",
  "{working-note}",
  "Mabel",
  CREATED_AT,
];

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeEmail", () => {
  test("trims the address and lower-cases it", () => {
    expect(normalizeEmail("  Mabel@Example.TEST\n")).toBe(EMAIL);
  });
});

describe("finding a user by email", () => {
  test("reads the account's row as a user", async () => {
    storedUsers([MABEL_ROW]);

    expect(await findUserByEmail(EMAIL)).toEqual(MABEL);
  });

  test("returns undefined for an address with no account", async () => {
    storedUsers([]);

    expect(await findUserByEmail(EMAIL)).toBeUndefined();
  });
});

describe("readSessionUser", () => {
  test("reads the user's row as a user", async () => {
    storedUsers([MABEL_ROW]);

    expect(await readSessionUser(USER_ID, 2)).toEqual(MABEL);
  });

  test("a user with no name has an undefined name", async () => {
    storedUsers([[USER_ID, EMAIL, "2", "{working-note}", null, CREATED_AT]]);

    expect(await readSessionUser(USER_ID, 2)).toEqual({
      ...MABEL,
      name: undefined,
    });
  });

  test("returns undefined when no user has that id at that epoch", async () => {
    storedUsers([]);

    expect(await readSessionUser(USER_ID, 1)).toBeUndefined();
  });
});

describe("readUserName", () => {
  // The database answers with these name rows.
  function storedNames(
    rows: readonly (readonly (string | null)[])[],
  ): FakeNeonHttp {
    const neonHttp = fakeNeonHttp({
      kind: "rows",
      columns: [{ name: "name", type: "text" }],
      rows,
    });
    vi.stubGlobal("fetch", neonHttp.fetch);
    return neonHttp;
  }

  test("reads the user's name", async () => {
    storedNames([["Mabel"]]);

    expect(await readUserName(USER_ID)).toBe("Mabel");
  });

  test("a null name is undefined", async () => {
    storedNames([[null]]);

    expect(await readUserName(USER_ID)).toBeUndefined();
  });

  test("a missing user has no name", async () => {
    storedNames([]);

    expect(await readUserName(USER_ID)).toBeUndefined();
  });
});

describe("user store failures", () => {
  test.each([
    ["find user by email", (): Promise<unknown> => findUserByEmail(EMAIL)],
    ["readSessionUser", (): Promise<unknown> => readSessionUser(USER_ID, 0)],
    ["endEverySession", (): Promise<unknown> => endEverySession(USER_ID)],
    ["saveHiddenExtras", (): Promise<unknown> => saveHiddenExtras(USER_ID, [])],
    ["saveUserName", (): Promise<unknown> => saveUserName(USER_ID, "Mabel")],
    ["readUserName", (): Promise<unknown> => readUserName(USER_ID)],
  ])(
    "%s rejects with a logged AppError when Postgres rejects the query",
    async (operation, call) => {
      vi.stubGlobal(
        "fetch",
        fakeNeonHttp({
          kind: "postgres-error",
          code: "42P01",
          message: 'relation "users" does not exist',
        }).fetch,
      );
      const log = spyOnErrorLog();

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toHaveProperty("errorCase", "database-query-failed");
      expect(log).toHaveBeenCalledWith(
        `[app-error] database-query-failed in ${operation}`,
        expect.any(String),
      );
    },
  );
});
