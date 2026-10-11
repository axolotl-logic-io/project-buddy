"use client";

import type { EnrichedPartState } from "@assistant-ui/react";
import type { JSX } from "react";
import { ManualCitationsPart } from "@/components/chat/manual-citations-part.tsx";
import { SearchManualPart } from "@/components/chat/search-manual-part.tsx";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

type ToolCallPart = Extract<EnrichedPartState, { type: "tool-call" }>;

// How each tool's calls render in the chat, by tool name. Every tool in
// TUTOR_TOOLS needs an entry, which a test checks. Add one entry, keyed by
// the constant in the tool's contract file, such as
// `[SEARCH_MANUAL_TOOL, (part) => <SearchManualPart part={part} />]`. The
// part component parses `part.result` with the contract's output schema. A
// tool the chat should not show renders null.
const TOOL_PARTS: ReadonlyMap<
  string,
  (part: ToolCallPart) => JSX.Element | null
> = new Map([
  [
    CITE_MANUAL_TOOL,
    (part: ToolCallPart): JSX.Element => <ManualCitationsPart part={part} />,
  ],
  [
    SEARCH_MANUAL_TOOL,
    (part: ToolCallPart): JSX.Element => <SearchManualPart part={part} />,
  ],
]);

export type { ToolCallPart };
export { TOOL_PARTS };
