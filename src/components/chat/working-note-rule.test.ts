import { describe, expect, test } from "vitest";
import {
  isWorkingNote,
  type NoteMessage,
  type NotePart,
} from "@/components/chat/working-note-rule.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

const TEXT: NotePart = { type: "text" };
// A call of a tool whose TOOL_PARTS entry is placed inline.
const SEARCH: NotePart = { type: "tool-call", toolName: SEARCH_MANUAL_TOOL };
// A call of a tool whose TOOL_PARTS entry is placed under the message.
const CITE: NotePart = { type: "tool-call", toolName: CITE_MANUAL_TOOL };
// A call of a tool that has no TOOL_PARTS entry, so the chat doesn't show it.
const UNSHOWN: NotePart = { type: "tool-call", toolName: "unshown_tool" };

// A reply from the tutor made of parts, in this order.
function reply(...parts: NotePart[]): NoteMessage {
  return { role: "assistant", parts };
}

describe("isWorkingNote for text before an inline tool part", () => {
  test("is true for the tutor's text before a search", () => {
    expect(isWorkingNote(reply(TEXT, SEARCH, TEXT), [0])).toBe(true);
  });

  test("is true for text between two searches", () => {
    expect(isWorkingNote(reply(SEARCH, TEXT, SEARCH, CITE, TEXT), [1])).toBe(
      true,
    );
  });

  test("is true for a whole run of text parts before a search", () => {
    expect(isWorkingNote(reply(TEXT, TEXT, SEARCH), [0, 1])).toBe(true);
  });

  test("turns true for streaming text once a search arrives after it", () => {
    expect(isWorkingNote(reply(SEARCH, TEXT), [1])).toBe(false);
    expect(isWorkingNote(reply(SEARCH, TEXT, SEARCH), [1])).toBe(true);
  });
});

describe("isWorkingNote for text that stays prose", () => {
  test("is false for the answer after the last search", () => {
    expect(isWorkingNote(reply(TEXT, SEARCH, TEXT), [2])).toBe(false);
  });

  test("is false for text before a citation only", () => {
    expect(isWorkingNote(reply(TEXT, CITE), [0])).toBe(false);
  });

  test("is false for a reply with no tools", () => {
    expect(isWorkingNote(reply(TEXT), [0])).toBe(false);
  });

  test("is false for text before a tool the chat doesn't show", () => {
    expect(isWorkingNote(reply(TEXT, UNSHOWN), [0])).toBe(false);
  });

  test("is false for the user's own text, whatever follows it", () => {
    expect(isWorkingNote({ role: "user", parts: [TEXT, SEARCH] }, [0])).toBe(
      false,
    );
  });

  test("is false for an empty run", () => {
    expect(isWorkingNote(reply(SEARCH), [])).toBe(false);
  });
});
