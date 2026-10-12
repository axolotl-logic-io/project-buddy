// For tests: tools only the tests know, one for each kind of TOOL_PARTS
// entry, so a test shows that a part's entry, not its tool, decides where
// the part shows and what the tutor's text before it is. Each fixture tool's
// part renders the tool's name.
import type { JSX } from "react";
import { vi } from "vitest";
import { TOOL_PARTS, type ToolPart } from "@/components/chat/tool-parts.tsx";

// Shows inline, and makes the tutor's text before it a working note.
const NOTE_MAKING_TOOL = "fixture_note_making_tool";
// Shows inline, and leaves the tutor's text before it as prose.
const INLINE_PROSE_TOOL = "fixture_inline_prose_tool";
// Shows under the rest of the message.
const UNDER_TOOL = "fixture_under_tool";

// A fixture tool's part: its name in a paragraph.
function namePart(toolName: string): ToolPart["render"] {
  return (): JSX.Element => <p>{toolName}</p>;
}

const FIXTURE_TOOL_PARTS: ReadonlyMap<string, ToolPart> = new Map<
  string,
  ToolPart
>([
  [
    NOTE_MAKING_TOOL,
    {
      render: namePart(NOTE_MAKING_TOOL),
      failure: "",
      placement: "inline",
      textBefore: "working-note",
    },
  ],
  [
    INLINE_PROSE_TOOL,
    {
      render: namePart(INLINE_PROSE_TOOL),
      failure: "",
      placement: "inline",
      textBefore: "prose",
    },
  ],
  [
    UNDER_TOOL,
    { render: namePart(UNDER_TOOL), failure: "", placement: "under" },
  ],
]);

// Makes TOOL_PARTS hold the fixture tools only, until the test's mocks are
// restored (vi.restoreAllMocks).
function stubToolParts(): void {
  vi.spyOn(TOOL_PARTS, "get").mockImplementation(
    (toolName: string): ToolPart | undefined =>
      FIXTURE_TOOL_PARTS.get(toolName),
  );
}

export { INLINE_PROSE_TOOL, NOTE_MAKING_TOOL, stubToolParts, UNDER_TOOL };
