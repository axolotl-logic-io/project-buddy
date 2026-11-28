// The app's log, which Vercel collects from the console: one line per
// failure on the error stream. The only module that writes to the console.

import type { EmailProblem } from "@/email/email-failure.ts";
import type { AppErrorCase } from "@/errors/app-error.ts";
import { databaseErrorDetails, describeDatabaseQuery } from "./neon-errors.ts";

type ErrorDetails = Readonly<Record<string, unknown>>;

const MAX_DESCRIBED_DEPTH = 4;

// Any other error's own `code`, such as Node's "UND_ERR_SOCKET".
function codeDetails(error: Error, details: ErrorDetails): ErrorDetails {
  const { code } = details;
  if (code !== undefined || !("code" in error)) {
    return {};
  }
  return { code: error.code };
}

function causeDetails(
  error: Error,
  describeCause: (cause: unknown) => ErrorDetails,
): ErrorDetails {
  if (error.cause === undefined) {
    return {};
  }
  return { cause: describeCause(error.cause) };
}

// The fields worth logging from an error and its causes: its name and
// message, the fields its provider module picks, and its cause.
function describeError(error: unknown, depth: number): ErrorDetails {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }
  function describeCause(cause: unknown): ErrorDetails {
    return describeError(cause, depth + 1);
  }
  const query = describeDatabaseQuery(error, describeCause);
  if (query !== undefined) {
    return query;
  }
  if (depth > MAX_DESCRIBED_DEPTH) {
    return { name: error.name, message: error.message };
  }
  const details: ErrorDetails = {
    name: error.name,
    message: error.message,
    ...databaseErrorDetails(error, describeCause),
  };
  return {
    ...details,
    ...codeDetails(error, details),
    ...causeDetails(error, describeCause),
  };
}

// Logs `error` as `[app-error] <case> in <operation>` followed by its
// details as JSON, without prompts, query parameters or secrets.
export function logAppError(
  errorCase: AppErrorCase,
  operation: string,
  error: unknown,
): void {
  console.error(
    `[app-error] ${errorCase} in ${operation}`,
    JSON.stringify(describeError(error, 0)),
  );
}

// Logs an email the site couldn't send as `[email-error] <problem> in
// <operation>` followed by error's details as JSON. The user is never told,
// so this line is the only sign of it. Callers pass errors that hold no
// address or link (EmailFailure, AppError).
export function logEmailFailure(
  problem: EmailProblem,
  operation: string,
  error: unknown,
): void {
  console.error(
    `[email-error] ${problem} in ${operation}`,
    JSON.stringify(describeError(error, 0)),
  );
}

// Logs a Zotero request that failed as `[zotero-error] <problem> in
// <operation>` followed by error's details as JSON. Callers pass errors
// that hold no API key or token (src/zotero/zotero-api.ts).
export function logZoteroFailure(
  problem: string,
  operation: string,
  error: unknown,
): void {
  console.error(
    `[zotero-error] ${problem} in ${operation}`,
    JSON.stringify(describeError(error, 0)),
  );
}
