// What the errors of a call to Claude look like: the AI SDK's errors for an
// HTTP error response, an error event in the response stream, exhausted
// retries, a missing API key and a timeout. This module knows their cases
// and which of their fields are safe to log.
import {
  APICallError,
  LoadAPIKeyError,
  RetryError,
  StreamProviderError,
} from "ai";
import { z } from "zod";
import type { AppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

type ModelErrorCase = Extract<
  AppErrorCase,
  | "out-of-credits"
  | "invalid-api-key"
  | "rate-limited"
  | "overloaded"
  | "request-too-large"
  | "model-server-error"
  | "invalid-request"
  | "model-unreachable"
>;

type ErrorDetails = Readonly<Record<string, unknown>>;

// What Anthropic reports about a failed call, from an HTTP error response or
// an error event in its response stream.
interface ModelErrorFields {
  readonly statusCode: number | undefined;
  readonly type: string | undefined;
  readonly message: string;
}

// Anthropic's error body, which the AI SDK keeps as an APICallError's `data`.
const ANTHROPIC_ERROR_BODY = z.object({
  error: z.object({ type: z.string() }),
});

const MAX_LOGGED_BODY_LENGTH = 2000;
const CREDIT_BALANCE_MESSAGE = /credit balance/iu;
const OVERLOADED_MESSAGE = /overloaded/iu;
const PROMPT_TOO_LONG_MESSAGE = /prompt is too long/iu;

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

// The error type in Anthropic's error body, if the body has one.
function anthropicErrorType(data: unknown): string | undefined {
  return ANTHROPIC_ERROR_BODY.safeParse(data).data?.error.type;
}

function modelErrorCase(fields: ModelErrorFields): ModelErrorCase | undefined {
  return MODEL_ERROR_RULES.find(([, matches]) => matches(fields))?.[0];
}

function apiCallErrorCase(error: APICallError): ModelErrorCase | "unknown" {
  const errorCase = modelErrorCase({
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

// The case of a failed call to Claude, or undefined if error didn't come
// from one.
function anthropicErrorCase(
  error: unknown,
): ModelErrorCase | "unknown" | undefined {
  if (RetryError.isInstance(error)) {
    return anthropicErrorCase(error.lastError);
  }
  if (LoadAPIKeyError.isInstance(error)) {
    return "invalid-api-key";
  }
  if (APICallError.isInstance(error)) {
    return apiCallErrorCase(error);
  }
  if (StreamProviderError.isInstance(error)) {
    return (
      modelErrorCase({
        statusCode: error.statusCode,
        type: error.type,
        message: error.message,
      }) ?? "unknown"
    );
  }
  // AbortSignal.timeout() on the model call.
  if (error instanceof Error && error.name === "TimeoutError") {
    return "model-unreachable";
  }
  return undefined;
}

// The fields of a failed call to Claude worth logging, beside its name and
// message: never the request body (the whole prompt) or headers other than
// the request id. An error event in the middle of a response stream carries
// no request id: the AI SDK keeps no response headers on it, and
// @ai-sdk/anthropic drops the event's own request_id. describeCause
// describes a nested error.
function anthropicErrorDetails(
  error: Error,
  describeCause: (cause: unknown) => ErrorDetails,
): ErrorDetails {
  if (APICallError.isInstance(error)) {
    return {
      url: error.url,
      statusCode: error.statusCode,
      isRetryable: error.isRetryable,
      type: anthropicErrorType(error.data),
      requestId: error.responseHeaders?.["request-id"],
      responseBody: error.responseBody?.slice(0, MAX_LOGGED_BODY_LENGTH),
    };
  }
  if (StreamProviderError.isInstance(error)) {
    return {
      statusCode: error.statusCode,
      type: error.type,
      code: error.code,
      isRetryable: error.isRetryable,
    };
  }
  if (RetryError.isInstance(error)) {
    return {
      reason: error.reason,
      errors: error.errors.map(describeCause),
    };
  }
  return {};
}

export { anthropicErrorCase, anthropicErrorDetails };
