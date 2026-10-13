import { afterEach, describe, expect, test, vi } from "vitest";
import {
  NOTE_MAKING_TOOL,
  stubToolParts,
  UNDER_TOOL,
} from "@/components/chat/tool-part-fixtures.tsx";
import { placementOf, TOOL_PARTS } from "@/components/chat/tool-parts.tsx";
import { DEFAULT_PERSONA_ID, getPersona } from "@/personas/index.ts";
import { tutorTools } from "@/tutor/tools/index.ts";

describe("TOOL_PARTS", () => {
  test("has a part for every tool the tutor may call", () => {
    const toolsWithoutPart = Object.keys(
      tutorTools(getPersona(DEFAULT_PERSONA_ID).parts),
    ).filter((toolName) => !TOOL_PARTS.has(toolName));

    expect(toolsWithoutPart).toEqual([]);
  });
});

describe("placementOf", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("is a tool call's placement, from its tool's entry", () => {
    stubToolParts();

    expect(
      placementOf({ type: "tool-call", toolName: NOTE_MAKING_TOOL }),
    ).toEqual(
      expect.objectContaining({
        placement: "inline",
        textBefore: "working-note",
      }),
    );
    expect(placementOf({ type: "tool-call", toolName: UNDER_TOOL })).toEqual(
      expect.objectContaining({ placement: "under" }),
    );
  });

  test("is undefined for other parts and for tools without an entry", () => {
    expect(placementOf({ type: "text" })).toBeUndefined();
    expect(
      placementOf({ type: "tool-call", toolName: "unshown_tool" }),
    ).toBeUndefined();
  });
});
