import { describe, expect, test } from "vitest";
import { DEFAULT_BUDDY_ID, getBuddy, snapshotOf } from "@/buddies/index.ts";
import { type ChatRow, toChats } from "@/chats/chat-rows.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";

const row: ChatRow = {
  id: chatIdFixture(),
  projectId: projectIdFixture(),
  userId: null,
  buddyId: "mr-tee",
  buddyName: null,
  buddyParts: null,
  name: null,
  renamedByHand: false,
  createdAt: new Date("2026-10-11T09:00:00Z"),
};
describe("legacy chat row decoding", () => {
  test.each([
    { buddyId: "mr-tee", expectedId: "mr-tee" as const },
    { buddyId: "retired-buddy", expectedId: DEFAULT_BUDDY_ID },
  ])(
    "a chat before snapshots uses its built-in buddy or the default: %s",
    ({ buddyId, expectedId }) => {
      expect(toChats([{ ...row, buddyId }])[0]?.buddy).toEqual(
        snapshotOf(getBuddy(expectedId)),
      );
    },
  );
  test("an old snapshot missing skill parts retains its own other text and gains defaults", () => {
    const buddy = {
      name: "Professor Bevel",
      parts: { ...getBuddy("mr-tee").parts, voice: "## Voice\n\nPrecise." },
    };
    const {
      brainstorming: _brainstorming,
      projectBreakdown: _breakdown,
      ...oldParts
    } = buddy.parts;

    expect(
      toChats([{ ...row, buddyName: buddy.name, buddyParts: oldParts }])[0]
        ?.buddy,
    ).toEqual(buddy);
  });
  test("a snapshot missing a part falls back to the built-in buddy", () => {
    const { voice: _voice, ...parts } = getBuddy("hippy").parts;
    expect(
      toChats([{ ...row, buddyName: "Own", buddyParts: parts }])[0]?.buddy,
    ).toEqual(snapshotOf(getBuddy("mr-tee")));
  });
  test("an invalid stored chat name reads as no name", () => {
    expect(toChats([{ ...row, name: "two\nlines" }])[0]?.name).toBeUndefined();
  });
});
