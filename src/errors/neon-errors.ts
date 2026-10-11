// What the errors of a query to Neon Postgres look like: drizzle's
// DrizzleQueryError around the Neon HTTP driver's NeonDbError, which carries
// Postgres's error fields, or the fetch error that stopped the driver
// reaching Neon in `sourceError`. This module knows their cases, which of
// their fields are safe to log, and where the original error is kept.
import { DrizzleQueryError } from "drizzle-orm";
import { z } from "zod";
import type { AppErrorCase } from "@/errors/app-error.ts";

type DatabaseErrorCase = Extract<
  AppErrorCase,
  "database-unreachable" | "database-query-failed"
>;

type ErrorDetails = Readonly<Record<string, unknown>>;

// A text field of Postgres's error, which the driver leaves undefined when
// Postgres didn't send it.
const POSTGRES_FIELD = z.string().optional().catch(undefined);

// The fields of the driver's NeonDbError that this module reads, checked by
// shape so that no driver class needs loading to recognize one.
const NEON_DB_ERROR = z.object({
  name: z.literal("NeonDbError"),
  message: z.string(),
  code: POSTGRES_FIELD,
  severity: POSTGRES_FIELD,
  detail: POSTGRES_FIELD,
  hint: POSTGRES_FIELD,
  sourceError: z.unknown().optional(),
});

type NeonDbErrorFields = z.infer<typeof NEON_DB_ERROR>;

// SQLSTATE classes 08 connection exception, 28 invalid authorization,
// 53 insufficient resources and 57P operator intervention (shutdown).
const UNREACHABLE_SQLSTATE = /^(?:08|28|53|57P)/u;
const CONNECTING_MESSAGE = /^Error connecting to database/u;
const SERVER_ERROR_MESSAGE = /^Server error \(HTTP status/u;

function readNeonDbError(error: unknown): NeonDbErrorFields | undefined {
  return NEON_DB_ERROR.safeParse(error).data;
}

function neonDbErrorCase(error: NeonDbErrorFields): DatabaseErrorCase {
  // The driver could not reach Neon's HTTP endpoint, or the endpoint failed
  // before running the query.
  if (
    error.sourceError !== undefined ||
    CONNECTING_MESSAGE.test(error.message) ||
    SERVER_ERROR_MESSAGE.test(error.message)
  ) {
    return "database-unreachable";
  }
  if (error.code !== undefined && UNREACHABLE_SQLSTATE.test(error.code)) {
    return "database-unreachable";
  }
  return "database-query-failed";
}

// The case of a failed database query, or undefined if error didn't come
// from one.
function databaseErrorCase(error: unknown): DatabaseErrorCase | undefined {
  if (error instanceof DrizzleQueryError) {
    return databaseErrorCase(error.cause) ?? "database-query-failed";
  }
  const neonDbError = readNeonDbError(error);
  if (neonDbError === undefined) {
    return undefined;
  }
  return neonDbErrorCase(neonDbError);
}

// The original error inside a NeonDbError, such as the fetch error that
// stopped it, which the driver keeps in `sourceError` rather than `cause`.
function databaseErrorSource(error: unknown): unknown {
  return readNeonDbError(error)?.sourceError;
}

// The whole description of a failed drizzle query: its SQL and its cause,
// leaving out the message, which lists the query's parameters. Undefined for
// any other error. describeCause describes a nested error.
function describeDatabaseQuery(
  error: Error,
  describeCause: (cause: unknown) => ErrorDetails,
): ErrorDetails | undefined {
  if (!(error instanceof DrizzleQueryError)) {
    return undefined;
  }
  return {
    name: "DrizzleQueryError",
    query: error.query,
    cause: describeCause(error.cause),
  };
}

// Postgres's error fields on a NeonDbError, worth logging beside its name and
// message.
function databaseErrorDetails(
  error: Error,
  describeCause: (cause: unknown) => ErrorDetails,
): ErrorDetails {
  const neonDbError = readNeonDbError(error);
  if (neonDbError === undefined) {
    return {};
  }
  const { code, severity, detail, hint, sourceError } = neonDbError;
  const details: ErrorDetails = { code, severity, detail, hint };
  if (sourceError === undefined) {
    return details;
  }
  return { ...details, sourceError: describeCause(sourceError) };
}

export {
  databaseErrorCase,
  databaseErrorDetails,
  databaseErrorSource,
  describeDatabaseQuery,
};
