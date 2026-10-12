// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  endEverySession,
  findOrCreateUser,
  findUserByEmail,
  normalizeEmail,
  readSessionUser,
  type User,
} from "@/accounts/users-store.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { userIdFixture } from "@/id-fixtures.ts";

const USER_ID = userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f");
const EMAIL = "mabel@example.test";
const CREATED_AT = "2026-10-12 09:00:00+00";
const BY_ID_AND_EPOCH =
  /"users"\."id" = \$1 and "users"\."session_epoch" = \$2/u;
const MABEL: User = {
  id: USER_ID,
  email: EMAIL,
  sessionEpoch: 2,
  hiddenExtras: ["working-note"],
};

// The database answers every query with these user rows.
function storedUsers(rows: readonly (readonly string[])[]): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [
      { name: "id", type: "text" },
      { name: "email", type: "text" },
      { name: "session_epoch", type: "int4" },
      { name: "hidden_extras", type: "_text" },
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

describe("findOrCreateUser", () => {
  test("saves the normalized address, keeping an existing account, and returns the account", async () => {
    const neonHttp = storedUsers([MABEL_ROW]);

    expect(await findOrCreateUser(" Mabel@Example.test ")).toEqual(MABEL);
    expect(neonHttp.queries).toHaveLength(1);
    expect(neonHttp.queries[0]?.query).toContain(
      'on conflict ("email") do update',
    );
    expect(neonHttp.queries[0]?.params).toEqual([EMAIL]);
  });

  test("refuses an address that is empty once trimmed, without a query", async () => {
    const neonHttp = storedUsers([MABEL_ROW]);
    spyOnErrorLog();

    const error = await findOrCreateUser("   ").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AppError);
    expect(neonHttp.queries).toHaveLength(0);
  });
});

describe("finding a user by email", () => {
  test("looks the normalized address up", async () => {
    const neonHttp = storedUsers([MABEL_ROW]);

    expect(await findUserByEmail("MABEL@example.test")).toEqual(MABEL);
    expect(neonHttp.queries[0]?.params).toEqual([EMAIL]);
  });

  test("returns undefined for an address with no account", async () => {
    storedUsers([]);

    expect(await findUserByEmail(EMAIL)).toBeUndefined();
  });
});

describe("readSessionUser", () => {
  test("reads the user by id and session epoch together", async () => {
    const neonHttp = storedUsers([MABEL_ROW]);

    expect(await readSessionUser(USER_ID, 2)).toEqual(MABEL);
    expect(neonHttp.queries[0]?.query).toMatch(BY_ID_AND_EPOCH);
    expect(neonHttp.queries[0]?.params).toEqual([USER_ID, "2"]);
  });

  test("returns undefined when no user has that id at that epoch", async () => {
    storedUsers([]);

    expect(await readSessionUser(USER_ID, 1)).toBeUndefined();
  });
});

describe("endEverySession", () => {
  test("raises the epoch and deletes the user's sign-in links in one batch", async () => {
    const neonHttp = storedUsers([]);

    await endEverySession(USER_ID);

    expect(neonHttp.batches).toHaveLength(1);
    const [raise, deleteLinks] = neonHttp.batches[0] ?? [];
    expect(raise?.query).toContain(
      'set "session_epoch" = "users"."session_epoch" + 1',
    );
    expect(raise?.params).toEqual([USER_ID]);
    expect(deleteLinks?.query).toContain('delete from "login_links"');
    expect(deleteLinks?.params).toEqual([USER_ID]);
  });
});

describe("user store failures", () => {
  test.each([
    ["findOrCreateUser", (): Promise<unknown> => findOrCreateUser(EMAIL)],
    ["find user by email", (): Promise<unknown> => findUserByEmail(EMAIL)],
    ["readSessionUser", (): Promise<unknown> => readSessionUser(USER_ID, 0)],
    ["endEverySession", (): Promise<unknown> => endEverySession(USER_ID)],
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
