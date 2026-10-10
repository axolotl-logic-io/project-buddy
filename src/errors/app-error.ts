import type { NeonDbError } from "@neondatabase/serverless";
import {
  APICallError,
  LoadAPIKeyError,
  RetryError,
  StreamProviderError,
} from "ai";
import { DrizzleQueryError } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import { describeError } from "@/errors/describe-error.ts";
import { anthropicErrorType, isNeonDbError } from "@/errors/upstream-errors.ts";

// The ways a call to Anthropic (through the AI SDK) or to Neon Postgres
// (through drizzle and the Neon HTTP driver) can fail.
const APP_ERROR_CASES = [
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

type AppErrorCase = (typeof APP_ERROR_CASES)[number];

type ModelErrorCase = Extract<
  AppErrorCase,
  | "out-of-credits"
  | "invalid-api-key"
  | "rate-limited"
  | "overloaded"
  | "request-too-large"
  | "model-server-error"
  | "invalid-request"
>;

type DatabaseErrorCase = Extract<
  AppErrorCase,
  "database-unreachable" | "database-query-failed"
>;

// What Anthropic reports about a failed call, from an HTTP error response or
// an error event in its response stream.
interface ModelErrorFields {
  readonly statusCode: number | undefined;
  readonly type: string | undefined;
  readonly message: string;
}

const APP_ERROR_CASE_SET: ReadonlySet<string> = new Set<string>(
  APP_ERROR_CASES,
);

// Static text shown to the user, never the upstream message.
const USER_MESSAGES: Readonly<Record<AppErrorCase, string>> = {
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

// The HTTP statuses Anthropic answers with, as listed in its API errors
// documentation (529 is its own "overloaded" status).
const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  payloadTooLarge: 413,
  tooManyRequests: 429,
  internalServerError: 500,
  overloaded: 529,
} as const;

const CREDIT_BALANCE_MESSAGE = /credit balance/iu;
const OVERLOADED_MESSAGE = /overloaded/iu;
const PROMPT_TOO_LONG_MESSAGE = /prompt is too long/iu;
// SQLSTATE classes 08 connection exception, 28 invalid authorization,
// 53 insufficient resources and 57P operator intervention (shutdown).
const UNREACHABLE_SQLSTATE = /^(?:08|28|53|57P)/u;

// How many links of an error's cause chain are searched for Next's
// control-flow errors.
const MAX_CAUSE_DEPTH = 5;

function isStatusAtLeast(
  statusCode: number | undefined,
  lowest: number,
): boolean {
  return statusCode !== undefined && statusCode >= lowest;
}

// Anthropic's error types and HTTP statuses, as listed in its API errors
// documentation and in @ai-sdk/anthropic's stream error handling. The first
// matching rule wins.
const MODEL_ERROR_RULES: readonly (readonly [
  ModelErrorCase,
  (fields: ModelErrorFields) => boolean,
])[] = [
  // A depleted balance is a 400 invalid_request_error whose message names it.
  [
    "out-of-credits",
    ({ statusCode, type, message }) =>
      type === "billing_error" ||
      statusCode === HTTP_STATUS.paymentRequired ||
      CREDIT_BALANCE_MESSAGE.test(message),
  ],
  [
    "invalid-api-key",
    ({ statusCode, type }) =>
      type === "authentication_error" ||
      type === "permission_error" ||
      statusCode === HTTP_STATUS.unauthorized ||
      statusCode === HTTP_STATUS.forbidden,
  ],
  [
    "rate-limited",
    ({ statusCode, type }) =>
      type === "rate_limit_error" || statusCode === HTTP_STATUS.tooManyRequests,
  ],
  [
    "overloaded",
    ({ statusCode, type, message }) =>
      type === "overloaded_error" ||
      statusCode === HTTP_STATUS.overloaded ||
      OVERLOADED_MESSAGE.test(message),
  ],
  // A context that is too long is a 400 invalid_request_error.
  [
    "request-too-large",
    ({ statusCode, type, message }) =>
      type === "request_too_large" ||
      statusCode === HTTP_STATUS.payloadTooLarge ||
      PROMPT_TOO_LONG_MESSAGE.test(message),
  ],
  [
    "model-server-error",
    ({ statusCode, type }) =>
      type === "api_error" ||
      type === "timeout_error" ||
      isStatusAtLeast(statusCode, HTTP_STATUS.internalServerError),
  ],
  [
    "invalid-request",
    ({ statusCode, type }) =>
      type === "invalid_request_error" ||
      type === "not_found_error" ||
      isStatusAtLeast(statusCode, HTTP_STATUS.badRequest),
  ],
];

function isAppErrorCase(value: string): value is AppErrorCase {
  return APP_ERROR_CASE_SET.has(value);
}

function classifyModelError(
  fields: ModelErrorFields,
): ModelErrorCase | undefined {
  return MODEL_ERROR_RULES.find(([, matches]) => matches(fields))?.[0];
}

function classifyApiCallError(error: APICallError): AppErrorCase {
  const errorCase = classifyModelError({
    statusCode: error.statusCode,
    type: anthropicErrorType(error.data),
    message: error.message,
  });
  if (errorCase !== undefined) {
    return errorCase;
  }
  // No HTTP error status: the request never got a response, or the
  // connection dropped while streaming one (the SDK marks it retryable).
  if (error.statusCode === undefined || error.isRetryable) {
    return "model-unreachable";
  }
  return "unknown";
}

function classifyNeonError(error: NeonDbError): DatabaseErrorCase {
  // The driver could not reach Neon's HTTP endpoint, or the endpoint failed
  // before running the query.
  if (
    error.sourceError !== undefined ||
    error.message.startsWith("Error connecting to database") ||
    error.message.startsWith("Server error (HTTP status")
  ) {
    return "database-unreachable";
  }
  if (error.code !== undefined && UNREACHABLE_SQLSTATE.test(error.code)) {
    return "database-unreachable";
  }
  return "database-query-failed";
}

// The next link of an error chain: Neon keeps the original error in
// `sourceError`, everything else in `cause`.
function nextErrorLink(link: object): unknown {
  if (
    "sourceError" in link &&
    link.sourceError !== undefined &&
    link.sourceError !== null
  ) {
    return link.sourceError;
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

export { APP_ERROR_CASES, type AppErrorCase };

export class AppError extends Error {
  readonly errorCase: AppErrorCase;

  constructor(errorCase: AppErrorCase, cause: unknown) {
    super(USER_MESSAGES[errorCase], { cause });
    this.name = "AppError";
    this.errorCase = errorCase;
  }
}

// The server sends only the case to the browser; any other text, such as a
// raw upstream message, shows the unknown message.
export function userMessageForCase(errorCase: string): string {
  if (isAppErrorCase(errorCase)) {
    return USER_MESSAGES[errorCase];
  }
  return USER_MESSAGES.unknown;
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
    return classifyApiCallError(error);
  }
  if (StreamProviderError.isInstance(error)) {
    return (
      classifyModelError({
        statusCode: error.statusCode,
        type: error.type,
        message: error.message,
      }) ?? "unknown"
    );
  }
  if (error instanceof DrizzleQueryError) {
    const causeCase = classifyError(error.cause);
    if (causeCase === "unknown") {
      return "database-query-failed";
    }
    return causeCase;
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
    rethrowNextControlFlow(error);
    throw toAppError(error, operation);
  }
}
