// @vitest-environment node
import { NeonDbError } from "@neondatabase/serverless";
import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import {
  APP_ERROR_CASES,
  AppError,
  type AppErrorCase,
} from "@/errors/app-error.ts";
import { classifyError } from "@/errors/classify-error.ts";
import {
  ANTHROPIC_URL,
  anthropicHttpError,
  anthropicStreamError,
  HTTP_STATUS,
  neonFetchFailure,
  postgresError,
} from "@/errors/error-fixtures.ts";

const examples: [AppErrorCase, string, unknown][] = [
  [
    "out-of-credits",
    "400 credit balance too low",
    anthropicHttpError(
      HTTP_STATUS.badRequest,
      "invalid_request_error",
      "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
    ),
  ],
  [
    "out-of-credits",
    "402 billing_error",
    anthropicHttpError(
      HTTP_STATUS.paymentRequired,
      "billing_error",
      "There's an issue with your billing.",
    ),
  ],
  [
    "out-of-credits",
    "billing_error in the stream",
    anthropicStreamError(
      "billing_error",
      "Billing issue.",
      HTTP_STATUS.badRequest,
    ),
  ],
  [
    "invalid-api-key",
    "401 authentication_error",
    anthropicHttpError(
      HTTP_STATUS.unauthorized,
      "authentication_error",
      "invalid x-api-key",
    ),
  ],
  [
    "invalid-api-key",
    "403 permission_error",
    anthropicHttpError(
      HTTP_STATUS.forbidden,
      "permission_error",
      "Your API key does not have permission to use the specified resource.",
    ),
  ],
  [
    "invalid-api-key",
    "missing ANTHROPIC_API_KEY",
    new LoadAPIKeyError({
      message:
        "Anthropic API key is missing. Pass it using the 'apiKey' parameter or the ANTHROPIC_API_KEY environment variable.",
    }),
  ],
  [
    "rate-limited",
    "429 rate_limit_error",
    anthropicHttpError(
      HTTP_STATUS.tooManyRequests,
      "rate_limit_error",
      "Number of request tokens has exceeded your per-minute rate limit",
      true,
    ),
  ],
  [
    "overloaded",
    "529 overloaded_error",
    anthropicHttpError(
      HTTP_STATUS.overloaded,
      "overloaded_error",
      "Overloaded",
      true,
    ),
  ],
  [
    "overloaded",
    "overloaded_error in the stream",
    anthropicStreamError(
      "overloaded_error",
      "Overloaded",
      HTTP_STATUS.overloaded,
    ),
  ],
  [
    "request-too-large",
    "413 request_too_large",
    anthropicHttpError(
      HTTP_STATUS.payloadTooLarge,
      "request_too_large",
      "Request exceeds the maximum allowed number of bytes.",
    ),
  ],
  [
    "request-too-large",
    "400 prompt is too long",
    anthropicHttpError(
      HTTP_STATUS.badRequest,
      "invalid_request_error",
      "prompt is too long: 215034 tokens > 200000 maximum",
    ),
  ],
  [
    "invalid-request",
    "400 invalid_request_error",
    anthropicHttpError(
      HTTP_STATUS.badRequest,
      "invalid_request_error",
      "messages: roles must alternate between user and assistant",
    ),
  ],
  [
    "invalid-request",
    "404 not_found_error for an unknown model",
    anthropicHttpError(
      HTTP_STATUS.notFound,
      "not_found_error",
      "model: claude-nope",
    ),
  ],
  [
    "model-server-error",
    "500 api_error",
    anthropicHttpError(
      HTTP_STATUS.internalServerError,
      "api_error",
      "Internal server error",
      true,
    ),
  ],
  [
    "model-server-error",
    "api_error in the stream",
    anthropicStreamError(
      "api_error",
      "Internal server error",
      HTTP_STATUS.internalServerError,
    ),
  ],
  [
    "model-server-error",
    "502 with an HTML body",
    new APICallError({
      message: "Bad Gateway",
      url: ANTHROPIC_URL,
      requestBodyValues: {},
      statusCode: HTTP_STATUS.badGateway,
      responseBody: "<html>bad gateway</html>",
      isRetryable: true,
    }),
  ],
  [
    "model-unreachable",
    "fetch failed before a response",
    new APICallError({
      message: "Cannot connect to API: getaddrinfo ENOTFOUND api.anthropic.com",
      url: ANTHROPIC_URL,
      requestBodyValues: {},
      cause: new Error("getaddrinfo ENOTFOUND api.anthropic.com"),
      isRetryable: true,
    }),
  ],
  [
    "model-unreachable",
    "connection dropped mid-stream",
    new APICallError({
      message: "Failed to process successful response",
      url: ANTHROPIC_URL,
      requestBodyValues: {},
      statusCode: HTTP_STATUS.ok,
      cause: Object.assign(new Error("other side closed"), {
        code: "UND_ERR_SOCKET",
      }),
      isRetryable: true,
    }),
  ],
  [
    "model-unreachable",
    "request timed out",
    new DOMException("The operation timed out.", "TimeoutError"),
  ],
  [
    "overloaded",
    "retries exhausted, last error overloaded",
    new RetryError({
      message: "Failed after 3 attempts. Last error: Overloaded",
      reason: "maxRetriesExceeded",
      errors: [
        anthropicHttpError(
          HTTP_STATUS.overloaded,
          "overloaded_error",
          "Overloaded",
          true,
        ),
        anthropicHttpError(
          HTTP_STATUS.overloaded,
          "overloaded_error",
          "Overloaded",
          true,
        ),
      ],
    }),
  ],
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
  ["unknown", "a plain Error", new Error("boom")],
  ["unknown", "a thrown string", "boom"],
  ["unknown", "undefined", undefined],
];

describe("classifyError", () => {
  test.each(examples)("classifies %s: %s", (expected, _trigger, error) => {
    expect(classifyError(error)).toBe(expected);
  });

  test("keeps the case of an AppError", () => {
    expect(classifyError(new AppError("rate-limited", new Error("x")))).toBe(
      "rate-limited",
    );
  });

  test("has an example for every case", () => {
    expect(new Set(examples.map(([errorCase]) => errorCase))).toEqual(
      new Set(APP_ERROR_CASES),
    );
  });
});
