import { describe, expect, test } from "vitest";
import {
  APP_ERROR_CASES,
  AppError,
  appErrorResponse,
  readAppErrorCase,
  userMessage,
} from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

const NOT_BLANK = /\S/u;
const MENTIONS_CREDITS = /credits/iu;
const MENTIONS_TRYING_LATER = /try again later/iu;
const MENTIONS_SIGNING_IN = /sign in/iu;

describe("userMessage", () => {
  test("gives every case its own static message", () => {
    const messages = APP_ERROR_CASES.map(userMessage);

    expect(new Set(messages).size).toBe(APP_ERROR_CASES.length);
    for (const message of messages) {
      expect(message).toMatch(NOT_BLANK);
    }
  });

  test("tells an invited user to try later, not to add credits, when the site's account is out of credits", () => {
    expect(userMessage("out-of-credits")).toMatch(MENTIONS_TRYING_LATER);
    expect(userMessage("out-of-credits")).not.toMatch(MENTIONS_CREDITS);
  });

  test("tells Autumn to sign in again when she is signed out", () => {
    expect(userMessage("signed-out")).toMatch(MENTIONS_SIGNING_IN);
  });
});

describe("readAppErrorCase", () => {
  test("reads every case from its name", () => {
    expect(APP_ERROR_CASES.map(readAppErrorCase)).toEqual([...APP_ERROR_CASES]);
  });

  test("reads anything else, such as a digest Next made, as unknown", () => {
    expect(readAppErrorCase("2071459210")).toBe("unknown");
    expect(readAppErrorCase(JSON.stringify({ error: "Unauthorized" }))).toBe(
      "unknown",
    );
    expect(readAppErrorCase("Your credit balance is too low")).toBe("unknown");
    expect(readAppErrorCase("")).toBe("unknown");
    expect(readAppErrorCase(undefined)).toBe("unknown");
  });
});

describe("appErrorResponse", () => {
  test("answers with the status and the case alone as plain text", async () => {
    const response = appErrorResponse("signed-out", HTTP_STATUS.unauthorized);

    expect(response.status).toBe(HTTP_STATUS.unauthorized);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("signed-out");
  });
});

describe("AppError", () => {
  test("carries its case as its digest, and the case's message", () => {
    const cause = new Error("fetch failed");
    const error = new AppError("database-unreachable", cause);

    expect(error.digest).toBe("database-unreachable");
    expect(error.message).toBe(userMessage("database-unreachable"));
    expect(error.cause).toBe(cause);
  });
});
