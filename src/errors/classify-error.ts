import type { NeonDbError } from "@neondatabase/serverless";
import {
  APICallError,
  LoadAPIKeyError,
  RetryError,
  StreamProviderError,
} from "ai";
import { DrizzleQueryError } from "drizzle-orm";
import { AppError, type AppErrorCase } from "@/errors/app-error.ts";
import { anthropicErrorType, isNeonDbError } from "@/errors/upstream-errors.ts";

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
    ({ statusCode, type, message }: ModelErrorFields): boolean =>
      type === "billing_error" ||
      statusCode === HTTP_STATUS.paymentRequired ||
      CREDIT_BALANCE_MESSAGE.test(message),
  ],
  [
    "invalid-api-key",
    ({ statusCode, type }: ModelErrorFields): boolean =>
      type === "authentication_error" ||
      type === "permission_error" ||
      statusCode === HTTP_STATUS.unauthorized ||
      statusCode === HTTP_STATUS.forbidden,
  ],
  [
    "rate-limited",
    ({ statusCode, type }: ModelErrorFields): boolean =>
      type === "rate_limit_error" || statusCode === HTTP_STATUS.tooManyRequests,
  ],
  [
    "overloaded",
    ({ statusCode, type, message }: ModelErrorFields): boolean =>
      type === "overloaded_error" ||
      statusCode === HTTP_STATUS.overloaded ||
      OVERLOADED_MESSAGE.test(message),
  ],
  // A context that is too long is a 400 invalid_request_error.
  [
    "request-too-large",
    ({ statusCode, type, message }: ModelErrorFields): boolean =>
      type === "request_too_large" ||
      statusCode === HTTP_STATUS.payloadTooLarge ||
      PROMPT_TOO_LONG_MESSAGE.test(message),
  ],
  [
    "model-server-error",
    ({ statusCode, type }: ModelErrorFields): boolean =>
      type === "api_error" ||
      type === "timeout_error" ||
      isStatusAtLeast(statusCode, HTTP_STATUS.internalServerError),
  ],
  [
    "invalid-request",
    ({ statusCode, type }: ModelErrorFields): boolean =>
      type === "invalid_request_error" ||
      type === "not_found_error" ||
      isStatusAtLeast(statusCode, HTTP_STATUS.badRequest),
  ],
];

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
