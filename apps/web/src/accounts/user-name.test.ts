import { describe, expect, test } from "vitest";
import { checkUserName, USER_NAME_MAX_LENGTH } from "@/accounts/user-name.ts";
import {
  LINE_SEPARATOR,
  PARAGRAPH_SEPARATOR,
} from "@/chats/chat-name-fixtures.ts";

describe("checkUserName", () => {
  test("returns the name trimmed", () => {
    expect(checkUserName("  Mabel \n")).toEqual({
      kind: "valid",
      name: "Mabel",
    });
  });

  test.each([
    ["an empty value", ""],
    ["only spaces", "   "],
    ["only line breaks", "\n\r\n"],
  ])("clears the name for %s", (_description, value) => {
    expect(checkUserName(value)).toEqual({ kind: "cleared" });
  });

  test("accepts a name of exactly the longest length", () => {
    const longest = "a".repeat(USER_NAME_MAX_LENGTH);

    expect(checkUserName(longest)).toEqual({ kind: "valid", name: longest });
  });

  test("refuses a name one character too long", () => {
    expect(checkUserName("a".repeat(USER_NAME_MAX_LENGTH + 1))).toEqual({
      kind: "refused",
      problem: "too-long",
    });
  });

  test.each([
    ["a line feed", "Ma\nbel"],
    ["a carriage return", "Ma\rbel"],
    ["a Unicode line separator", `Ma${LINE_SEPARATOR}bel`],
    ["a Unicode paragraph separator", `Ma${PARAGRAPH_SEPARATOR}bel`],
  ])("refuses a name with %s", (_description, value) => {
    expect(checkUserName(value)).toEqual({
      kind: "refused",
      problem: "multi-line",
    });
  });

  test.each([
    ["an opening brace", "Ma{bel"],
    ["a closing brace", "Mabel}"],
    ["the placeholder itself", "{{name}}"],
  ])("refuses a name with %s", (_description, value) => {
    expect(checkUserName(value)).toEqual({
      kind: "refused",
      problem: "braces",
    });
  });
});
