import { describe, expect, test } from "vitest";
import { APP_ERROR_CASES, userMessageForCase } from "@/errors/app-error.ts";

const NOT_BLANK = /\S/u;
const MENTIONS_CREDITS = /credits/iu;

describe("userMessageForCase", () => {
  test("gives every case its own static message", () => {
    const messages = APP_ERROR_CASES.map(userMessageForCase);

    expect(new Set(messages).size).toBe(APP_ERROR_CASES.length);
    for (const message of messages) {
      expect(message).toMatch(NOT_BLANK);
    }
  });

  test("tells Autumn to add credits when the account is out of credits", () => {
    expect(userMessageForCase("out-of-credits")).toMatch(MENTIONS_CREDITS);
  });

  test("shows the unknown message for text that is not a case", () => {
    expect(userMessageForCase("Your credit balance is too low")).toBe(
      userMessageForCase("unknown"),
    );
    expect(userMessageForCase("")).toBe(userMessageForCase("unknown"));
  });
});
