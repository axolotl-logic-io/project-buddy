import { describe, expect, expectTypeOf, test } from "vitest";
import {
  CHAT_NAME_MAX_LENGTH,
  type ChatName,
  checkChatName,
  parseChatName,
} from "@/chats/chat-name.ts";
import {
  LINE_SEPARATOR,
  PARAGRAPH_SEPARATOR,
} from "@/chats/chat-name-fixtures.ts";

const TOO_LONG = "a".repeat(CHAT_NAME_MAX_LENGTH + 1);

describe("parseChatName", () => {
  test("returns one line of text, trimmed", () => {
    expect(parseChatName("  Beveling the donut \n")).toBe("Beveling the donut");
  });

  test("accepts a name of exactly the longest length", () => {
    const longest = "a".repeat(CHAT_NAME_MAX_LENGTH);

    expect(parseChatName(longest)).toBe(longest);
  });

  test.each([
    ["an empty string", ""],
    ["only spaces", "   "],
    ["a name one character too long", TOO_LONG],
    ["two lines", "Beveling\nthe donut"],
    ["a carriage return inside", "Beveling\rthe donut"],
    ["a Unicode line separator inside", `Beveling${LINE_SEPARATOR}the donut`],
  ])("returns undefined for %s", (_description, value) => {
    expect(parseChatName(value)).toBeUndefined();
  });

  test("a ChatName is a string that a plain string cannot stand in for", () => {
    expectTypeOf<ChatName>().toExtend<string>();
    expectTypeOf<string>().not.toExtend<ChatName>();
  });
});

describe("checkChatName", () => {
  test("accepts a name as parseChatName does, trimmed", () => {
    expect(checkChatName("  Beveling the donut \n")).toEqual({
      kind: "valid",
      name: parseChatName("Beveling the donut"),
    });
  });

  test.each([
    ["an empty string", "", "empty"],
    ["only spaces and line breaks", ` \n${LINE_SEPARATOR} `, "empty"],
    ["a name one character too long", TOO_LONG, "too-long"],
    ["two lines", "Beveling\nthe donut", "multi-line"],
    ["a carriage return inside", "Beveling\rthe donut", "multi-line"],
    [
      "a Unicode line separator inside",
      `Beveling${LINE_SEPARATOR}the donut`,
      "multi-line",
    ],
    [
      "a Unicode paragraph separator inside",
      `Beveling${PARAGRAPH_SEPARATOR}the donut`,
      "multi-line",
    ],
    ["too long a name of two lines", `Beveling\n${TOO_LONG}`, "multi-line"],
  ])("refuses %s, saying why", (_description, value, problem) => {
    expect(checkChatName(value)).toEqual({ kind: "refused", problem });
  });
});
