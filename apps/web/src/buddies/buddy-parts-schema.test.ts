import { describe, expect, test } from "vitest";
import type { BuddyParts } from "@/buddies/buddy.ts";
import { parseBuddyParts } from "@/buddies/buddy-parts-schema.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";

// Mr. Tee's parts, as they were stored before the central chat part.
function storedBeforeCentralChat(): Omit<BuddyParts, "centralChat"> {
  const { centralChat: _added, ...stored } = getBuddy("mr-tee").parts;
  return stored;
}

describe("stored buddy parts", () => {
  test("lacking the central chat part read it as the default buddy's text", () => {
    const stored = storedBeforeCentralChat();

    expect(parseBuddyParts(stored)).toEqual({
      ...stored,
      centralChat: getBuddy(DEFAULT_BUDDY_ID).parts.centralChat,
    });
  });

  test("keep their own central chat part", () => {
    const stored = { ...storedBeforeCentralChat(), centralChat: "Just chat." };

    expect(parseBuddyParts(stored)?.centralChat).toBe("Just chat.");
  });

  test("lacking any other part are not a buddy's parts", () => {
    const { answerNow: _missing, ...stored } = getBuddy("mr-tee").parts;

    expect(parseBuddyParts(stored)).toBeUndefined();
  });
});
