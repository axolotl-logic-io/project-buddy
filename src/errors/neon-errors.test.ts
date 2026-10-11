// @vitest-environment node
import { NeonDbError } from "@neondatabase/serverless";
import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import type { AppErrorCase } from "@/errors/app-error.ts";
import {
  anthropicHttpError,
  neonFetchFailure,
  postgresError,
} from "@/errors/error-fixtures.ts";
import {
  databaseErrorCase,
  databaseErrorSource,
} from "@/errors/neon-errors.ts";
import { HTTP_STATUS } from "@/http-status.ts";

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
