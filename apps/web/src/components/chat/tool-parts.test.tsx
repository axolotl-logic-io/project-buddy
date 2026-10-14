import { afterEach, describe, expect, test, vi } from "vitest";
import {
  INLINE_PROSE_TOOL,
  NOTE_MAKING_TOOL,
  stubToolParts,
  UNDER_TOOL,
} from "@/components/chat/tool-part-fixtures.tsx";
import {
  makesNoteOfTextBefore,
  placementOf,
  TOOL_PARTS,
} from "@/components/chat/tool-parts.tsx";
import { DEFAULT_PERSONA_ID, getPersona } from "@/personas/index.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { tutorTools } from "@/tutor/tools/index.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

describe("TOOL_PARTS", () => {
  test("has a part for every tool the tutor may call", () => {
    const toolsWithoutPart = Object.keys(
      tutorTools(getPersona(DEFAULT_PERSONA_ID).parts),
    ).filter((toolName) => !TOOL_PARTS.has(toolName));

    expect(toolsWithoutPart).toEqual([]);
  });

  // `working-notes-quiet`: only the tools that look something up make the text
  // before them a working note. A memory save doesn't, so a summary written
  // before it stays prose. The citations show under the message.
  test("makes a note of the text before a search of the manual", () => {
    expect(
      makesNoteOfTextBefore({
        type: "tool-call",
        toolName: SEARCH_MANUAL_TOOL,
      }),
    ).toBe(true);
  });

  test("leaves the text before a change to the memory as prose", () => {
    expect(
      makesNoteOfTextBefore({
        type: "tool-call",
        toolName: UPDATE_MEMORY_TOOL,
      }),
    ).toBe(false);
  });

  test("shows the manual citations under the message", () => {
    expect(placementOf({ type: "tool-call", toolName: CITE_MANUAL_TOOL })).toBe(
      "under",
    );
  });
});

describe("placementOf", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("is a tool call's placement, from its tool's entry", () => {
    stubToolParts();

    expect(placementOf({ type: "tool-call", toolName: NOTE_MAKING_TOOL })).toBe(
      "inline",
    );
    expect(placementOf({ type: "tool-call", toolName: UNDER_TOOL })).toBe(
      "under",
    );
  });

  test("is undefined for other parts and for tools without an entry", () => {
    stubToolParts();

    expect(placementOf({ type: "text" })).toBeUndefined();
    expect(
      placementOf({ type: "tool-call", toolName: "unshown_tool" }),
    ).toBeUndefined();
  });
});

describe("makesNoteOfTextBefore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("is true for an inline tool whose entry makes a working note", () => {
    stubToolParts();

    expect(
      makesNoteOfTextBefore({ type: "tool-call", toolName: NOTE_MAKING_TOOL }),
    ).toBe(true);
  });

  test("is false for an inline tool that leaves the text prose", () => {
    stubToolParts();

    expect(
      makesNoteOfTextBefore({ type: "tool-call", toolName: INLINE_PROSE_TOOL }),
    ).toBe(false);
  });

  test("is false for a tool shown under the message", () => {
    stubToolParts();

    expect(
      makesNoteOfTextBefore({ type: "tool-call", toolName: UNDER_TOOL }),
    ).toBe(false);
  });

  test("is false for other parts and for tools without an entry", () => {
    stubToolParts();

    expect(makesNoteOfTextBefore({ type: "text" })).toBe(false);
    expect(
      makesNoteOfTextBefore({ type: "tool-call", toolName: "unshown_tool" }),
    ).toBe(false);
  });
});
