// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { AppError, userMessage } from "@/errors/app-error.ts";
import {
  anthropicHttpError,
  neonFetchFailure,
  postgresError,
} from "@/errors/error-fixtures.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { toAppError, withAppErrors } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

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
    expect(error.message).toBe(userMessage("out-of-credits"));
    expect(error.message).not.toContain("credit balance");
  });

  test("returns an AppError unchanged without logging it again", () => {
    const log = spyOnErrorLog();
    const appError = new AppError("overloaded", new Error("x"));

    expect(toAppError(appError, "chat reply")).toBe(appError);
    expect(log).not.toHaveBeenCalled();
  });
});

describe("toAppError logging", () => {
  test("logs the failure once, with its case and operation", () => {
    const log = spyOnErrorLog();

    toAppError(postgresError("22P02", "invalid input syntax"), "getChat");

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.join(" ")).toContain(
      "[app-error] database-query-failed in getChat",
    );
  });

  test("logs the same failure once, however often it is turned into an AppError", () => {
    const log = spyOnErrorLog();
    const failure = neonFetchFailure();

    toAppError(failure, "chat reply");
    const again = toAppError(failure, "chat reply");

    expect(again.errorCase).toBe("database-unreachable");
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe("toAppError cases", () => {
  test.each([
    [
      "out-of-credits",
      "a call to Claude",
      anthropicHttpError(
        HTTP_STATUS.paymentRequired,
        "billing_error",
        "There's an issue with your billing.",
      ),
    ],
    ["database-unreachable", "a database query", neonFetchFailure()],
    ["unknown", "a plain Error", new Error("boom")],
    ["unknown", "a thrown string", "boom"],
    ["unknown", "undefined", undefined],
  ])("gives %s to %s", (expected, _source, error) => {
    spyOnErrorLog();

    expect(toAppError(error, "test").errorCase).toBe(expected);
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
