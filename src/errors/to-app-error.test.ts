// @vitest-environment node
import { APICallError } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AppError, userMessageForCase } from "@/errors/app-error.ts";
import {
  ANTHROPIC_URL,
  anthropicHttpError,
  HTTP_STATUS,
  neonFetchFailure,
  postgresError,
  REQUEST_ID,
} from "@/errors/error-fixtures.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { toAppError, withAppErrors } from "@/errors/to-app-error.ts";

const CALL_RESULT = 42;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toAppError", () => {
  test("carries the case, the original error and the static message", () => {
    spyOnErrorLog();
    const original = anthropicHttpError(
      HTTP_STATUS.badRequest,
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

  test("returns an AppError unchanged without logging it again", () => {
    const log = spyOnErrorLog();
    const appError = new AppError("overloaded", new Error("x"));

    expect(toAppError(appError, "chat reply")).toBe(appError);
    expect(log).not.toHaveBeenCalled();
  });
});

describe("what toAppError logs", () => {
  test("the case with the status, upstream message and request id", () => {
    const log = spyOnErrorLog();

    toAppError(
      anthropicHttpError(
        HTTP_STATUS.badRequest,
        "invalid_request_error",
        "Your credit balance is too low to access the Anthropic API.",
      ),
      "chat reply",
    );

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0]?.join(" ");
    expect(line).toContain("[app-error] out-of-credits in chat reply");
    expect(line).toContain('"statusCode":400');
    expect(line).toContain("Your credit balance is too low");
    expect(line).toContain(`"requestId":"${REQUEST_ID}"`);
    expect(line).toContain('"type":"invalid_request_error"');
  });

  test("the Postgres code and the query, but not the query parameters", () => {
    const log = spyOnErrorLog();

    toAppError(postgresError("22P02", "invalid input syntax"), "getChat");

    const line = log.mock.calls[0]?.join(" ");
    expect(line).toContain("[app-error] database-query-failed in getChat");
    expect(line).toContain('"code":"22P02"');
    expect(line).toContain("invalid input syntax");
    expect(line).toContain('from \\"chats\\"');
    expect(line).not.toContain("not-a-uuid");
  });

  test("nothing of the request body sent to the model", () => {
    const log = spyOnErrorLog();
    const error = new APICallError({
      message: "Overloaded",
      url: ANTHROPIC_URL,
      requestBodyValues: { system: "persona prompt", messages: ["secret"] },
      statusCode: HTTP_STATUS.overloaded,
    });

    toAppError(error, "chat reply");

    const line = log.mock.calls[0]?.join(" ");
    expect(line).not.toContain("persona prompt");
    expect(line).not.toContain("secret");
  });
});

describe("withAppErrors", () => {
  test("returns the call's result", async () => {
    expect(
      await withAppErrors("listProjects", () => Promise.resolve(CALL_RESULT)),
    ).toBe(CALL_RESULT);
  });

  test("rethrows a failure as an AppError and logs it", async () => {
    const log = spyOnErrorLog();
    const original = neonFetchFailure();

    const error = await withAppErrors("listProjects", () =>
      Promise.reject(original),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toHaveProperty("errorCase", "database-unreachable");
    expect(error).toHaveProperty("cause", original);
    expect(log.mock.calls[0]?.join(" ")).toContain(
      "[app-error] database-unreachable in listProjects",
    );
  });

  test("passes Next's prerender abort through without logging it", async () => {
    const log = spyOnErrorLog();
    // Next rejects fetch() when a prerender finishes; Neon keeps that error
    // in sourceError and drizzle wraps Neon's error in cause.
    const abort = Object.assign(new Error("During prerendering, ..."), {
      digest: "HANGING_PROMISE_REJECTION",
    });
    const neon = Object.assign(new Error("Error connecting to database"), {
      name: "NeonDbError",
      sourceError: abort,
    });
    const drizzle = new Error("Failed query", { cause: neon });

    const error = await withAppErrors("listProjects", () =>
      Promise.reject(drizzle),
    ).catch((caught: unknown) => caught);

    expect(error).toBe(abort);
    expect(log).not.toHaveBeenCalled();
  });
});
