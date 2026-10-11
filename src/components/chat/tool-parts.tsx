"use client";

import type { EnrichedPartState } from "@assistant-ui/react";
import type { JSX } from "react";
import { MemoryChangePart } from "@/components/chat/memory-change-part.tsx";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

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
    UPDATE_MEMORY_TOOL,
    (part: ToolCallPart): JSX.Element => <MemoryChangePart part={part} />,
  ],
]);

export type { ToolCallPart };
export { TOOL_PARTS };
