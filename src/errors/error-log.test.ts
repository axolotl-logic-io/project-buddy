// @vitest-environment node
import { APICallError } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  ANTHROPIC_URL,
  anthropicHttpError,
  HTTP_STATUS,
  postgresError,
  REQUEST_ID,
} from "@/errors/error-fixtures.ts";
import { logAppError } from "@/errors/error-log.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logAppError", () => {
  test("logs the case with the status, upstream message and request id", () => {
    const log = spyOnErrorLog();

    logAppError(
      "out-of-credits",
      "chat reply",
      anthropicHttpError(
        HTTP_STATUS.badRequest,
        "invalid_request_error",
        "Your credit balance is too low to access the Anthropic API.",
      ),
    );

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0]?.join(" ");
    expect(line).toContain("[app-error] out-of-credits in chat reply");
    expect(line).toContain('"statusCode":400');
    expect(line).toContain("Your credit balance is too low");
    expect(line).toContain(`"requestId":"${REQUEST_ID}"`);
    expect(line).toContain('"type":"invalid_request_error"');
  });

  test("logs the Postgres code and the query, but not the query parameters", () => {
    const log = spyOnErrorLog();

    logAppError(
      "database-query-failed",
      "getChat",
      postgresError("22P02", "invalid input syntax"),
    );

    const line = log.mock.calls[0]?.join(" ");
    expect(line).toContain("[app-error] database-query-failed in getChat");
    expect(line).toContain('"code":"22P02"');
    expect(line).toContain("invalid input syntax");
    expect(line).toContain('from \\"chats\\"');
    expect(line).not.toContain("not-a-uuid");
  });

  test("logs nothing of the request body sent to the model", () => {
    const log = spyOnErrorLog();
    const error = new APICallError({
      message: "Overloaded",
      url: ANTHROPIC_URL,
      requestBodyValues: { system: "persona prompt", messages: ["secret"] },
      statusCode: HTTP_STATUS.overloaded,
    });

    logAppError("overloaded", "chat reply", error);

    const line = log.mock.calls[0]?.join(" ");
    expect(line).not.toContain("persona prompt");
    expect(line).not.toContain("secret");
  });
});
