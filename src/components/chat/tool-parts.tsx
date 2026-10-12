"use client";

import type { EnrichedPartState, PartState } from "@assistant-ui/react";
import type { JSX } from "react";
import { ManualCitationsPart } from "@/components/chat/manual-citations-part.tsx";
import { MemoryChangePart } from "@/components/chat/memory-change-part.tsx";
import { SearchManualPart } from "@/components/chat/search-manual-part.tsx";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";
import { TOOL_FAILURES_COPY } from "@/ui/copy/chat.ts";

type ToolCallPart = Extract<EnrichedPartState, { type: "tool-call" }>;

// Where a tool's calls show in their message, and so what the tutor's text
// before one of them is.
type Placement =
  // In the order the parts arrived. The tutor's text before such a call is a
  // working note if the tool looks something up, such as a search of the
  // manual; otherwise it stays prose, such as a summary written before a
  // memory change.
  | {
      readonly placement: "inline";
      readonly textBefore: "working-note" | "prose";
    }
  // Under the rest of the message, wherever they arrived, such as the
  // citations. The text before them stays prose.
  | { readonly placement: "under" };

// How the chat shows one tool's calls: its look, and its Placement.
type ToolPart = Placement & {
  // A call that is running or has answered. The part component parses
  // `part.result` with the contract's output schema, and renders null for a
  // call the chat should not show. It never sees a failed call.
  readonly render: (part: ToolCallPart) => JSX.Element | null;
  // The line the chat shows instead when the call failed.
  readonly failure: string;
};

// What placementOf reads of a message's part: its type, and a tool call's
// tool name.
type PlacedPart =
  | { readonly type: "tool-call"; readonly toolName: string }
  | { readonly type: Exclude<PartState["type"], "tool-call"> };

// How each tool's calls render in the chat, by tool name. Every tool in
// TUTOR_TOOLS needs an entry, which a test checks. Add one entry, keyed by
// the constant in the tool's contract file, such as
// `[SEARCH_MANUAL_TOOL, { render: (part: ToolCallPart): JSX.Element => <SearchManualPart part={part} />, failure: TOOL_FAILURES_COPY.searchManual, placement: "inline", textBefore: "working-note" }]`.
const TOOL_PARTS: ReadonlyMap<string, ToolPart> = new Map([
  [
    CITE_MANUAL_TOOL,
    {
      render: (part: ToolCallPart): JSX.Element => (
        <ManualCitationsPart part={part} />
      ),
      failure: TOOL_FAILURES_COPY.citeManual,
      placement: "under",
    },
  ],
  [
    SEARCH_MANUAL_TOOL,
    {
      render: (part: ToolCallPart): JSX.Element => (
        <SearchManualPart part={part} />
      ),
      failure: TOOL_FAILURES_COPY.searchManual,
      placement: "inline",
      textBefore: "working-note",
    },
  ],
  [
    UPDATE_MEMORY_TOOL,
    {
      render: (part: ToolCallPart): JSX.Element => (
        <MemoryChangePart part={part} />
      ),
      failure: TOOL_FAILURES_COPY.updateMemory,
      placement: "inline",
      textBefore: "prose",
    },
  ],
]);

// Where part shows in its message: a tool call's Placement from its entry,
// or undefined for any other part and for a tool the chat doesn't show.
function placementOf(part: PlacedPart): Placement | undefined {
  if (part.type !== "tool-call") {
    return;
  }
  return TOOL_PARTS.get(part.toolName);
}

export type { PlacedPart, Placement, ToolCallPart, ToolPart };
export { placementOf, TOOL_PARTS };
