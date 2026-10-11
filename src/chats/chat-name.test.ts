import { describe, expect, expectTypeOf, test } from "vitest";
import {
  CHAT_NAME_MAX_LENGTH,
  type ChatName,
  parseChatName,
} from "@/chats/chat-name.ts";

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
    ["a name one character too long", "a".repeat(CHAT_NAME_MAX_LENGTH + 1)],
    ["two lines", "Beveling\nthe donut"],
    ["a carriage return inside", "Beveling\rthe donut"],
    [
      "a Unicode line separator inside",
      ["Beveling", "the donut"].join("\u2028"),
    ],
  ])("returns undefined for %s", (_description, value) => {
    expect(parseChatName(value)).toBeUndefined();
  });

  test("a ChatName is a string that a plain string cannot stand in for", () => {
    expectTypeOf<ChatName>().toExtend<string>();
    expectTypeOf<string>().not.toExtend<ChatName>();
  });
});
