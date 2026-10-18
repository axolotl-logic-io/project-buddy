// @vitest-environment node
import { NeonDbError } from "@neondatabase/serverless";
import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import type { AppErrorCase } from "@/errors/app-error.ts";
import {
  databaseErrorCase,
  databaseErrorSource,
  violatesForeignKey,
} from "@/errors/neon-errors.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  anthropicHttpError,
  neonFetchFailure,
  postgresError,
} from "./error-fixtures.ts";

const OWNER_KEY = "monthly_spend_user_id_users_id_fk";

// What drizzle throws when Postgres rejects an insert with code, naming
// constraint as the one it broke.
function brokenConstraint(code: string, constraint: string): DrizzleQueryError {
  const error = new NeonDbError("insert or update violates a constraint");
  error.code = code;
  error.constraint = constraint;
  return new DrizzleQueryError('insert into "monthly_spend" …', [], error);
}

const examples: [AppErrorCase, string, unknown][] = [
  ["database-unreachable", "Neon fetch failed", neonFetchFailure()],
  [
    "database-unreachable",
    "Neon HTTP 503",
    new DrizzleQueryError(
      "select 1",
      [],
      new NeonDbError("Server error (HTTP status 503): upstream unavailable"),
    ),
  ],
  [
    "database-unreachable",
    "password authentication failed (28P01)",
    postgresError("28P01", "password authentication failed for user 'app'"),
  ],
  [
    "database-unreachable",
    "too many connections (53300)",
    postgresError("53300", "too many connections for role"),
  ],
  [
    "database-unreachable",
    "compute shutting down (57P01)",
    postgresError("57P01", "terminating connection due to administrator"),
  ],
  [
    "database-query-failed",
    "id that is not a UUID (22P02)",
    postgresError("22P02", 'invalid input syntax for type uuid: "x"'),
  ],
  [
    "database-query-failed",
    "missing table (42P01)",
    postgresError("42P01", 'relation "chats" does not exist'),
  ],
  [
    "database-query-failed",
    "a drizzle failure without a Neon error",
    new DrizzleQueryError("select 1", [], new Error("boom")),
  ],
];

describe("databaseErrorCase", () => {
  test.each(examples)("classifies %s: %s", (expected, _trigger, error) => {
    expect(databaseErrorCase(error)).toBe(expected);
  });

  test("recognizes a Neon error by its shape, not its class", () => {
    const neonShaped = Object.assign(
      new Error("Error connecting to database"),
      {
        name: "NeonDbError",
      },
    );

    expect(databaseErrorCase(neonShaped)).toBe("database-unreachable");
  });

  test("leaves errors that didn't come from a query alone", () => {
    expect(
      databaseErrorCase(
        anthropicHttpError(HTTP_STATUS.overloaded, "overloaded_error", "x"),
      ),
    ).toBeUndefined();
    expect(databaseErrorCase(new Error("boom"))).toBeUndefined();
    expect(databaseErrorCase(undefined)).toBeUndefined();
  });
});

describe("databaseErrorSource", () => {
  test("finds the fetch error the driver keeps in sourceError", () => {
    const failure = neonFetchFailure();

    expect(databaseErrorSource(failure.cause)).toBeInstanceOf(TypeError);
    expect(databaseErrorSource(new Error("boom"))).toBeUndefined();
  });
});

describe("violatesForeignKey", () => {
  test("is true for a foreign key violation (23503) of the named constraint", () => {
    expect(
      violatesForeignKey(brokenConstraint("23503", OWNER_KEY), OWNER_KEY),
    ).toBe(true);
  });

  test("is false for another constraint, another error code or another error", () => {
    expect(
      violatesForeignKey(
        brokenConstraint("23503", "projects_user_id_users_id_fk"),
        OWNER_KEY,
      ),
    ).toBe(false);
    expect(
      violatesForeignKey(brokenConstraint("23505", OWNER_KEY), OWNER_KEY),
    ).toBe(false);
    expect(
      violatesForeignKey(postgresError("42P01", "no such table"), OWNER_KEY),
    ).toBe(false);
    expect(violatesForeignKey(neonFetchFailure(), OWNER_KEY)).toBe(false);
    expect(violatesForeignKey(new Error(OWNER_KEY), OWNER_KEY)).toBe(false);
  });
});
