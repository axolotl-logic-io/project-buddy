"use client";

import type { EnrichedPartState } from "@assistant-ui/react";
import type { JSX } from "react";
import { ManualCitationsPart } from "@/components/chat/manual-citations-part.tsx";
import { MemoryChangePart } from "@/components/chat/memory-change-part.tsx";
import { SearchManualPart } from "@/components/chat/search-manual-part.tsx";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";
import { COPY } from "@/ui/copy.ts";

type ToolCallPart = Extract<EnrichedPartState, { type: "tool-call" }>;

// How the chat shows one tool's calls.
interface ToolPart {
  // A call that is running or has answered. The part component parses
  // `part.result` with the contract's output schema, and renders null for a
  // call the chat should not show. It never sees a failed call.
  readonly render: (part: ToolCallPart) => JSX.Element | null;
  // The line the chat shows instead when the call failed.
  readonly failure: string;
  // Where its calls show in their message: "inline", in the order the parts
  // arrived, or "under" the rest of the message, wherever they arrived.
  readonly placement: "inline" | "under";
}

// How each tool's calls render in the chat, by tool name. Every tool in
// TUTOR_TOOLS needs an entry, which a test checks. Add one entry, keyed by
// the constant in the tool's contract file, such as
// `[SEARCH_MANUAL_TOOL, { render: (part: ToolCallPart): JSX.Element => <SearchManualPart part={part} />, failure: COPY.toolFailures.searchManual, placement: "inline" }]`.
const TOOL_PARTS: ReadonlyMap<string, ToolPart> = new Map([
  [
    CITE_MANUAL_TOOL,
    {
      render: (part: ToolCallPart): JSX.Element => (
        <ManualCitationsPart part={part} />
      ),
      failure: COPY.toolFailures.citeManual,
      placement: "under",
    },
  ],
  [
    SEARCH_MANUAL_TOOL,
    {
      render: (part: ToolCallPart): JSX.Element => (
        <SearchManualPart part={part} />
      ),
      failure: COPY.toolFailures.searchManual,
      placement: "inline",
    },
  ],
  [
    UPDATE_MEMORY_TOOL,
    {
      render: (part: ToolCallPart): JSX.Element => (
        <MemoryChangePart part={part} />
      ),
      failure: COPY.toolFailures.updateMemory,
      placement: "inline",
    },
  ],
]);

export type { ToolCallPart, ToolPart };
export { TOOL_PARTS };
