// @vitest-environment node
import { NeonDbError } from "@neondatabase/serverless";
import {
  APICallError,
  LoadAPIKeyError,
  RetryError,
  StreamProviderError,
} from "ai";
import { DrizzleQueryError } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APP_ERROR_CASES,
  AppError,
  type AppErrorCase,
  classifyError,
  toAppError,
  userMessageForCase,
  withAppErrors,
} from "@/errors/app-error";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// An APICallError as @ai-sdk/anthropic builds it from a failed HTTP response:
// the parsed body becomes `data` and its error message the error's message.
function anthropicHttpError(
  statusCode: number,
  type: string,
  message: string,
  isRetryable = false,
) {
  const body = {
    type: "error",
    error: { type, message },
    request_id: "req_011CTest",
  };
  return new APICallError({
    message,
    url: ANTHROPIC_URL,
    requestBodyValues: { model: "claude-sonnet-5-5", messages: [] },
    statusCode,
    responseHeaders: {
      "request-id": "req_011CTest",
      "content-type": "application/json",
    },
    responseBody: JSON.stringify(body),
    data: body,
    isRetryable,
  });
}

// An error event inside Anthropic's response stream, as the AI SDK reports it.
function anthropicStreamError(
  type: string,
  message: string,
  statusCode: number,
) {
  return new StreamProviderError({
    message,
    type,
    statusCode,
    data: { type, message },
  });
}

// The Neon HTTP driver puts Postgres error fields on NeonDbError; drizzle
// wraps it in DrizzleQueryError with the query and its parameters.
function postgresError(code: string, message: string) {
  const error = new NeonDbError(message);
  error.code = code;
  error.severity = "ERROR";
  return new DrizzleQueryError(
    'select "id" from "chats" where "chats"."id" = $1',
    ["not-a-uuid"],
    error,
  );
}

function neonFetchFailure() {
  const fetchError = new TypeError("fetch failed");
  const error = new NeonDbError(
    `Error connecting to database: ${String(fetchError)}`,
  );
  error.sourceError = fetchError;
  return new DrizzleQueryError("select 1", [], error);
}

const examples: [AppErrorCase, string, unknown][] = [
  [
    "out-of-credits",
    "400 credit balance too low",
    anthropicHttpError(
      400,
      "invalid_request_error",
      "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
    ),
  ],
  [
    "out-of-credits",
    "402 billing_error",
    anthropicHttpError(
      402,
      "billing_error",
      "There's an issue with your billing.",
    ),
  ],
  [
    "out-of-credits",
    "billing_error in the stream",
    anthropicStreamError("billing_error", "Billing issue.", 400),
  ],
  [
    "invalid-api-key",
    "401 authentication_error",
    anthropicHttpError(401, "authentication_error", "invalid x-api-key"),
  ],
  [
    "invalid-api-key",
    "403 permission_error",
    anthropicHttpError(
      403,
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
      429,
      "rate_limit_error",
      "Number of request tokens has exceeded your per-minute rate limit",
      true,
    ),
  ],
  [
    "overloaded",
    "529 overloaded_error",
    anthropicHttpError(529, "overloaded_error", "Overloaded", true),
  ],
  [
    "overloaded",
    "overloaded_error in the stream",
    anthropicStreamError("overloaded_error", "Overloaded", 529),
  ],
  [
    "request-too-large",
    "413 request_too_large",
    anthropicHttpError(
      413,
      "request_too_large",
      "Request exceeds the maximum allowed number of bytes.",
    ),
  ],
  [
    "request-too-large",
    "400 prompt is too long",
    anthropicHttpError(
      400,
      "invalid_request_error",
      "prompt is too long: 215034 tokens > 200000 maximum",
    ),
  ],
  [
    "invalid-request",
    "400 invalid_request_error",
    anthropicHttpError(
      400,
      "invalid_request_error",
      "messages: roles must alternate between user and assistant",
    ),
  ],
  [
    "invalid-request",
    "404 not_found_error for an unknown model",
    anthropicHttpError(404, "not_found_error", "model: claude-nope"),
  ],
  [
    "model-server-error",
    "500 api_error",
    anthropicHttpError(500, "api_error", "Internal server error", true),
  ],
  [
    "model-server-error",
    "api_error in the stream",
    anthropicStreamError("api_error", "Internal server error", 500),
  ],
  [
    "model-server-error",
    "502 with an HTML body",
    new APICallError({
      message: "Bad Gateway",
      url: ANTHROPIC_URL,
      requestBodyValues: {},
      statusCode: 502,
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
      statusCode: 200,
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
        anthropicHttpError(529, "overloaded_error", "Overloaded", true),
        anthropicHttpError(529, "overloaded_error", "Overloaded", true),
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
  it.each(examples)("classifies %s: %s", (expected, _trigger, error) => {
    expect(classifyError(error)).toBe(expected);
  });

  it("keeps the case of an AppError", () => {
    expect(classifyError(new AppError("rate-limited", new Error("x")))).toBe(
      "rate-limited",
    );
  });

  it("has an example for every case", () => {
    expect(new Set(examples.map(([errorCase]) => errorCase))).toEqual(
      new Set(APP_ERROR_CASES),
    );
  });
});

describe("userMessageForCase", () => {
  it("gives every case its own static message", () => {
    const messages = APP_ERROR_CASES.map(userMessageForCase);

    expect(new Set(messages).size).toBe(APP_ERROR_CASES.length);
    for (const message of messages) {
      expect(message).toMatch(/\S/);
    }
  });

  it("tells Autumn to add credits when the account is out of credits", () => {
    expect(userMessageForCase("out-of-credits")).toMatch(/credits/i);
  });

  it("shows the unknown message for text that is not a case", () => {
    expect(userMessageForCase("Your credit balance is too low")).toBe(
      userMessageForCase("unknown"),
    );
    expect(userMessageForCase("")).toBe(userMessageForCase("unknown"));
  });
});

describe("toAppError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("carries the case, the original error and the static message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const original = anthropicHttpError(
      400,
      "invalid_request_error",
      "Your credit balance is too low to access the Anthropic API.",
    );

    const error = toAppError(original, "chat reply");

    expect(error).toBeInstanceOf(AppError);
    expect(error.errorCase).toBe("out-of-credits");
    expect(error.cause).toBe(original);
    expect(error.message).toBe(userMessageForCase("out-of-credits"));
    expect(error.message).not.toContain("credit balance");
  });

  it("logs the case with the status, upstream message and request id", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    toAppError(
      anthropicHttpError(
        400,
        "invalid_request_error",
        "Your credit balance is too low to access the Anthropic API.",
      ),
      "chat reply",
    );

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0].join(" ");
    expect(line).toContain("[app-error] out-of-credits in chat reply");
    expect(line).toContain('"statusCode":400');
    expect(line).toContain("Your credit balance is too low");
    expect(line).toContain('"requestId":"req_011CTest"');
    expect(line).toContain('"type":"invalid_request_error"');
  });

  it("logs the Postgres code and the query but not the query parameters", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    toAppError(postgresError("22P02", "invalid input syntax"), "getChat");

    const line = log.mock.calls[0].join(" ");
    expect(line).toContain("[app-error] database-query-failed in getChat");
    expect(line).toContain('"code":"22P02"');
    expect(line).toContain("invalid input syntax");
    expect(line).toContain('from \\"chats\\"');
    expect(line).not.toContain("not-a-uuid");
  });

  it("does not log the request body sent to the model", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new APICallError({
      message: "Overloaded",
      url: ANTHROPIC_URL,
      requestBodyValues: { system: "persona prompt", messages: ["secret"] },
      statusCode: 529,
    });

    toAppError(error, "chat reply");

    const line = log.mock.calls[0].join(" ");
    expect(line).not.toContain("persona prompt");
    expect(line).not.toContain("secret");
  });

  it("returns an AppError unchanged without logging it again", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const appError = new AppError("overloaded", new Error("x"));

    expect(toAppError(appError, "chat reply")).toBe(appError);
    expect(log).not.toHaveBeenCalled();
  });
});

describe("withAppErrors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the call's result", async () => {
    expect(await withAppErrors("listProjects", async () => 42)).toBe(42);
  });

  it("rethrows a failure as an AppError and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = neonFetchFailure();

    const error = await withAppErrors("listProjects", async () => {
      throw original;
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).errorCase).toBe("database-unreachable");
    expect((error as AppError).cause).toBe(original);
    expect(log.mock.calls[0].join(" ")).toContain(
      "[app-error] database-unreachable in listProjects",
    );
  });
});
