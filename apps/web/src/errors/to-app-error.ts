// The server's entry point to the errors module: whatever a call to Claude
// or the database throws becomes an AppError with its case, logged once.
// Which case an error is, and what of it is logged, is left to the provider
// modules (anthropic-errors.ts, neon-errors.ts).
import { unstable_rethrow } from "next/navigation";
import { anthropicErrorCase } from "@/errors/anthropic-errors.ts";
import { AppError, type AppErrorCase } from "@/errors/app-error.ts";
import { logAppError } from "@/errors/error-log.ts";
import {
  databaseErrorCase,
  databaseErrorSource,
} from "@/errors/neon-errors.ts";

// How many links of an error's cause chain are searched for Next's
// control-flow errors.
const MAX_CAUSE_DEPTH = 5;

// Errors already logged, so that each is logged once however often it is
// turned into an AppError, such as by both copies of a reply's stream.
const loggedErrors: WeakSet<object> = new WeakSet();

function classifyError(error: unknown): AppErrorCase {
  return anthropicErrorCase(error) ?? databaseErrorCase(error) ?? "unknown";
}

// The next link of an error chain: Neon keeps the original error in
// `sourceError`, everything else in `cause`.
function nextErrorLink(link: object): unknown {
  const source = databaseErrorSource(link);
  if (source !== undefined && source !== null) {
    return source;
  }
  if ("cause" in link) {
    return link.cause;
  }
  return undefined;
}

// Next uses errors for control flow, such as rejecting fetch() when a prerender
// finishes. They must reach Next untouched and are not failures. Next's
// unstable_rethrow follows `cause`; Neon keeps the original in `sourceError`.
function rethrowNextControlFlow(error: unknown): void {
  let link = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof link !== "object" || link === null) {
      return;
    }
    unstable_rethrow(link);
    link = nextErrorLink(link);
  }
}

// Logs error unless it was logged before. Values that aren't objects can't
// be remembered, so they are logged every time.
function logOnce(
  errorCase: AppErrorCase,
  operation: string,
  error: unknown,
): void {
  if (typeof error === "object" && error !== null) {
    if (loggedErrors.has(error)) {
      return;
    }
    loggedErrors.add(error);
  }
  logAppError(errorCase, operation, error);
}

// The error factory. It turns any thrown value into an AppError and logs the
// original with its case, once per original. An AppError passes through
// unlogged, since it was logged where it was made.
export function toAppError(error: unknown, operation: string): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const appError = new AppError(classifyError(error), error);
  logOnce(appError.errorCase, operation, error);
  return appError;
}

// Runs a call to an external API so that any failure becomes a logged AppError.
export async function withAppErrors<T>(
  operation: string,
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    rethrowNextControlFlow(error);
    throw toAppError(error, operation);
  }
}
