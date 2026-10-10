import type { NeonDbError } from "@neondatabase/serverless";
import {
  APICallError,
  LoadAPIKeyError,
  RetryError,
  StreamProviderError,
} from "ai";
import { DrizzleQueryError } from "drizzle-orm";

// The ways a call to Anthropic (through the AI SDK) or to Neon Postgres
// (through drizzle and the Neon HTTP driver) can fail.
export const APP_ERROR_CASES = [
  "out-of-credits",
  "invalid-api-key",
  "rate-limited",
  "overloaded",
  "request-too-large",
  "invalid-request",
  "model-server-error",
  "model-unreachable",
  "database-unreachable",
  "database-query-failed",
  "unknown",
] as const;

export type AppErrorCase = (typeof APP_ERROR_CASES)[number];

// Static text shown to the user, never the upstream message.
const USER_MESSAGES: Record<AppErrorCase, string> = {
  "out-of-credits":
    "The Anthropic account is out of credits. Add credits in the Anthropic Console, then send your message again.",
  "invalid-api-key":
    "Anthropic rejected the site's API key, or the key is missing. Check ANTHROPIC_API_KEY in the Vercel project.",
  "rate-limited":
    "Too many requests to Claude right now. Wait a minute, then try again.",
  overloaded: "Claude is overloaded right now. Try again in a few minutes.",
  "request-too-large":
    "This chat is too long for Claude to read in one go. Start a new chat to continue.",
  "invalid-request":
    "Claude rejected the request. Try again, and check the server logs if it keeps failing.",
  "model-server-error":
    "Claude's service had an internal error. Try again in a few minutes.",
  "model-unreachable": "The site couldn't reach Claude. Try again in a moment.",
  "database-unreachable":
    "The database can't be reached right now. Try again in a few minutes.",
  "database-query-failed":
    "The database rejected a request. Check the server logs for details.",
  unknown:
    "Something went wrong. Try again, and check the server logs if it keeps failing.",
};

export class AppError extends Error {
  readonly errorCase: AppErrorCase;

  constructor(errorCase: AppErrorCase, cause: unknown) {
    super(USER_MESSAGES[errorCase], { cause });
    this.name = "AppError";
    this.errorCase = errorCase;
  }
}

function isAppErrorCase(value: string): value is AppErrorCase {
  return (APP_ERROR_CASES as readonly string[]).includes(value);
}

// The server sends only the case to the browser; any other text, such as a
// raw upstream message, shows the unknown message.
export function userMessageForCase(errorCase: string): string {
  return USER_MESSAGES[isAppErrorCase(errorCase) ? errorCase : "unknown"];
}

// Anthropic's error types and HTTP statuses, as listed in its API errors
// documentation and in @ai-sdk/anthropic's stream error handling.
function classifyModelError(
  statusCode: number | undefined,
  type: string | undefined,
  message: string,
): AppErrorCase | undefined {
  // A depleted balance is a 400 invalid_request_error whose message names it.
  if (
    type === "billing_error" ||
    statusCode === 402 ||
    /credit balance/i.test(message)
  ) {
    return "out-of-credits";
  }
  if (
    type === "authentication_error" ||
    type === "permission_error" ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    return "invalid-api-key";
  }
  if (type === "rate_limit_error" || statusCode === 429) {
    return "rate-limited";
  }
  if (
    type === "overloaded_error" ||
    statusCode === 529 ||
    /overloaded/i.test(message)
  ) {
    return "overloaded";
  }
  // A context that is too long is a 400 invalid_request_error.
  if (
    type === "request_too_large" ||
    statusCode === 413 ||
    /prompt is too long/i.test(message)
  ) {
    return "request-too-large";
  }
  if (
    type === "api_error" ||
    type === "timeout_error" ||
    (statusCode !== undefined && statusCode >= 500)
  ) {
    return "model-server-error";
  }
  if (
    type === "invalid_request_error" ||
    type === "not_found_error" ||
    (statusCode !== undefined && statusCode >= 400)
  ) {
    return "invalid-request";
  }
  return undefined;
}

// The error type in Anthropic's error body, which the AI SDK keeps as `data`.
function anthropicErrorType(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("error" in data)) {
    return undefined;
  }
  const { error } = data;
  if (typeof error !== "object" || error === null || !("type" in error)) {
    return undefined;
  }
  return typeof error.type === "string" ? error.type : undefined;
}

// Checked by name so this module stays free of the driver in client bundles.
function isNeonDbError(error: unknown): error is NeonDbError {
  return error instanceof Error && error.name === "NeonDbError";
}

function classifyNeonError(error: NeonDbError): AppErrorCase {
  // The driver could not reach Neon's HTTP endpoint, or the endpoint failed
  // before running the query.
  if (
    error.sourceError !== undefined ||
    error.message.startsWith("Error connecting to database") ||
    error.message.startsWith("Server error (HTTP status")
  ) {
    return "database-unreachable";
  }
  // SQLSTATE classes 08 connection exception, 28 invalid authorization,
  // 53 insufficient resources and 57P operator intervention (shutdown).
  if (error.code !== undefined && /^(08|28|53|57P)/.test(error.code)) {
    return "database-unreachable";
  }
  return "database-query-failed";
}

export function classifyError(error: unknown): AppErrorCase {
  if (error instanceof AppError) {
    return error.errorCase;
  }
  if (RetryError.isInstance(error)) {
    return classifyError(error.lastError);
  }
  if (LoadAPIKeyError.isInstance(error)) {
    return "invalid-api-key";
  }
  if (APICallError.isInstance(error)) {
    const errorCase = classifyModelError(
      error.statusCode,
      anthropicErrorType(error.data),
      error.message,
    );
    if (errorCase) {
      return errorCase;
    }
    // No HTTP error status: the request never got a response, or the
    // connection dropped while streaming one (the SDK marks it retryable).
    if (error.statusCode === undefined || error.isRetryable) {
      return "model-unreachable";
    }
    return "unknown";
  }
  if (StreamProviderError.isInstance(error)) {
    return (
      classifyModelError(error.statusCode, error.type, error.message) ??
      "unknown"
    );
  }
  if (error instanceof DrizzleQueryError) {
    const causeCase = classifyError(error.cause);
    return causeCase === "unknown" ? "database-query-failed" : causeCase;
  }
  if (isNeonDbError(error)) {
    return classifyNeonError(error);
  }
  // AbortSignal.timeout() on the model call. Neon wraps its own fetch errors.
  if (error instanceof Error && error.name === "TimeoutError") {
    return "model-unreachable";
  }
  return "unknown";
}

const MAX_LOGGED_BODY_LENGTH = 2000;

// The fields worth logging from an error and its causes. It leaves out the
// model request body (the whole prompt), request and response headers other
// than the request id, and drizzle's query parameters.
function describeError(error: unknown, depth = 0): unknown {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }
  if (depth > 4) {
    return { name: error.name, message: error.message };
  }
  if (error instanceof DrizzleQueryError) {
    return {
      name: "DrizzleQueryError",
      query: error.query,
      cause: describeError(error.cause, depth + 1),
    };
  }
  const details: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };
  if (APICallError.isInstance(error)) {
    details.url = error.url;
    details.statusCode = error.statusCode;
    details.isRetryable = error.isRetryable;
    details.type = anthropicErrorType(error.data);
    details.requestId = error.responseHeaders?.["request-id"];
    details.responseBody = error.responseBody?.slice(0, MAX_LOGGED_BODY_LENGTH);
  }
  if (StreamProviderError.isInstance(error)) {
    details.statusCode = error.statusCode;
    details.type = error.type;
    details.code = error.code;
    details.isRetryable = error.isRetryable;
  }
  if (RetryError.isInstance(error)) {
    details.reason = error.reason;
    details.errors = error.errors.map((attempt) =>
      describeError(attempt, depth + 1),
    );
  }
  if (isNeonDbError(error)) {
    details.code = error.code;
    details.severity = error.severity;
    details.detail = error.detail;
    details.hint = error.hint;
    details.sourceError = error.sourceError
      ? describeError(error.sourceError, depth + 1)
      : undefined;
  }
  if ("code" in error && details.code === undefined) {
    details.code = error.code;
  }
  if (error.cause !== undefined) {
    details.cause = describeError(error.cause, depth + 1);
  }
  return details;
}

// The error factory. It turns any thrown value into an AppError and logs the
// original with its case. An AppError passes through unlogged, since it was
// logged where it was made.
export function toAppError(error: unknown, operation: string): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const appError = new AppError(classifyError(error), error);
  console.error(
    `[app-error] ${appError.errorCase} in ${operation}`,
    JSON.stringify(describeError(error)),
  );
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
    throw toAppError(error, operation);
  }
}
