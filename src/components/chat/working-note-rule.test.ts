import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  INLINE_PROSE_TOOL,
  NOTE_MAKING_TOOL,
  stubToolParts,
  UNDER_TOOL,
} from "@/components/chat/tool-part-fixtures.tsx";
import type { PlacedPart } from "@/components/chat/tool-parts.tsx";
import {
  isWorkingNote,
  type NoteMessage,
} from "@/components/chat/working-note-rule.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

const TEXT: PlacedPart = { type: "text" };
// A call of a tool whose entry shows it inline and makes the text before it
// a working note, as a search of the manual's does.
const SEARCH: PlacedPart = { type: "tool-call", toolName: NOTE_MAKING_TOOL };
// A call of a tool whose entry shows it inline but leaves the text before
// it as prose.
const INLINE_PROSE: PlacedPart = {
  type: "tool-call",
  toolName: INLINE_PROSE_TOOL,
};
// A call of a tool whose entry places it under the message, as the
// citations' does.
const CITE: PlacedPart = { type: "tool-call", toolName: UNDER_TOOL };
// A call of a tool that has no TOOL_PARTS entry, so the chat doesn't show it.
const UNSHOWN: PlacedPart = { type: "tool-call", toolName: "unshown_tool" };

// A reply from the tutor made of parts, in this order.
function reply(...parts: PlacedPart[]): NoteMessage {
  return { role: "assistant", parts };
}

describe("isWorkingNote for text before an inline tool part", () => {
  beforeEach(() => {
    stubToolParts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
  beforeEach(() => {
    stubToolParts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("is false for the answer after the last search", () => {
    expect(isWorkingNote(reply(TEXT, SEARCH, TEXT), [2])).toBe(false);
  });

  test("is false for text before a citation only", () => {
    expect(isWorkingNote(reply(TEXT, CITE), [0])).toBe(false);
  });

  test("is false for a reply with no tools", () => {
    expect(isWorkingNote(reply(TEXT), [0])).toBe(false);
  });

  test("is false for text before an inline tool that leaves it prose", () => {
    expect(isWorkingNote(reply(TEXT, INLINE_PROSE, TEXT), [0])).toBe(false);
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

// Autumn's ruling: only the tools that look something up make the text
// before them a working note. A memory save doesn't, so a summary written
// before it stays prose.
describe("isWorkingNote with the chat's own tools", () => {
  test("is true for text before a search of the manual", () => {
    const search: PlacedPart = {
      type: "tool-call",
      toolName: SEARCH_MANUAL_TOOL,
    };

    expect(isWorkingNote(reply(TEXT, search, TEXT), [0])).toBe(true);
  });

  test("is false for text before a change to the memory", () => {
    const memoryChange: PlacedPart = {
      type: "tool-call",
      toolName: UPDATE_MEMORY_TOOL,
    };

    expect(isWorkingNote(reply(TEXT, memoryChange, TEXT), [0])).toBe(false);
  });
});
