// @vitest-environment node
import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import { describe, expect, test } from "vitest";
import { anthropicErrorCase } from "@/errors/anthropic-errors.ts";
import type { AppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  ANTHROPIC_URL,
  anthropicHttpError,
  anthropicStreamError,
  neonFetchFailure,
} from "./error-fixtures.ts";

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
];

describe("anthropicErrorCase", () => {
  test.each(examples)("classifies %s: %s", (expected, _trigger, error) => {
    expect(anthropicErrorCase(error)).toBe(expected);
  });

  test("gives the unknown case to a model error it can't place", () => {
    expect(
      anthropicErrorCase(
        new APICallError({
          message: "Unexpected response",
          url: ANTHROPIC_URL,
          requestBodyValues: {},
          statusCode: HTTP_STATUS.ok,
          isRetryable: false,
        }),
      ),
    ).toBe("unknown");
  });

  test("leaves errors that didn't come from the model call alone", () => {
    expect(anthropicErrorCase(neonFetchFailure())).toBeUndefined();
    expect(anthropicErrorCase(new Error("boom"))).toBeUndefined();
    expect(anthropicErrorCase("boom")).toBeUndefined();
  });
});
