import type { EnrichedPartState, PartState } from "@assistant-ui/react";
import type { ComponentType } from "react";
import { CastSpellPart } from "@/components/chat/cast-spell-part.tsx";
import { GeneratedImagePart } from "@/components/chat/generated-image-part.tsx";
import { MilestonePart } from "@/components/chat/milestone-part.tsx";
import { QuestStatusPart } from "@/components/chat/quest-status-part.tsx";
import { TasksChangeToolPart } from "@/components/chat/tasks-change-part.tsx";
import { GENERATE_IMAGE_TOOL } from "@/images/generation-contract.ts";
import { CHANGE_TASKS_TOOL } from "@/replies/tools/change-tasks-contract.ts";
import { QUEST_STATUS_TOOL } from "@/replies/tools/quest-status-contract.ts";
import { RECORD_MILESTONE_TOOL } from "@/replies/tools/record-milestone-contract.ts";
import { CAST_SPELL_TOOL } from "@/spells/cast-spell-contract.ts";
import { TOOL_FAILURES_COPY } from "@/ui/copy/chat.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

type ToolCallPart = Extract<EnrichedPartState, { type: "tool-call" }>;

// Where a tool's calls show in their message, and so what the construct's text
// before one of them is.
type Placement =
  // In the order the parts arrived. The construct's text before such a call is a
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
  readonly component: ComponentType<{ readonly part: ToolCallPart }>;
  // The line the chat shows instead when the call failed.
  readonly failure: string;
};

// Where a tool's calls show in their message: "inline" or "under".
type PlacementKind = Placement["placement"];

// What placementOf and makesNoteOfTextBefore read of a message's part: its
// type, and a tool call's tool name.
type PlacedPart =
  | { readonly type: "tool-call"; readonly toolName: string }
  | { readonly type: Exclude<PartState["type"], "tool-call"> };

// How each tool's calls render in the chat, by tool name. Every tool in
// chatTools (src/replies/tools/index.ts) needs an entry,
// which a test checks. Add one entry, keyed by
// the constant in the tool's contract file, such as
const TOOL_PARTS: ReadonlyMap<string, ToolPart> = new Map([
  [
    QUEST_STATUS_TOOL,
    {
      component: QuestStatusPart,
      failure: TOOL_FAILURES_COPY.questStatus,
      placement: "inline",
      textBefore: "prose",
    },
  ],
  [
    GENERATE_IMAGE_TOOL,
    {
      component: GeneratedImagePart,
      failure: GENERATION_COPY.failed,
      placement: "inline",
      textBefore: "prose",
    },
  ],
  [
    CHANGE_TASKS_TOOL,
    {
      component: TasksChangeToolPart,
      failure: TOOL_FAILURES_COPY.changeTasks,
      placement: "inline",
      textBefore: "prose",
    },
  ],
  [
    RECORD_MILESTONE_TOOL,
    {
      component: MilestonePart,
      failure: TOOL_FAILURES_COPY.recordMilestone,
      placement: "inline",
      textBefore: "prose",
    },
  ],
  [
    CAST_SPELL_TOOL,
    {
      component: CastSpellPart,
      failure: TOOL_FAILURES_COPY.castSpell,
      placement: "inline",
      // A cast loads instructions, as a lookup does, often before a search.
      textBefore: "working-note",
    },
  ],
]);

// A tool call's entry, or undefined for any other part and for a tool the
// chat doesn't show.
function entryOf(part: PlacedPart): ToolPart | undefined {
  if (part.type !== "tool-call") {
    return;
  }
  return TOOL_PARTS.get(part.toolName);
}

// Where part shows in its message: a tool call's placement from its entry,
// or undefined for any other part and for a tool the chat doesn't show.
function placementOf(part: PlacedPart): PlacementKind | undefined {
  return entryOf(part)?.placement;
}

// Whether part makes the construct's text before it a working note: a tool call
// whose entry shows it inline with textBefore "working-note".
function makesNoteOfTextBefore(part: PlacedPart): boolean {
  const entry = entryOf(part);
  return entry?.placement === "inline" && entry.textBefore === "working-note";
}

export type { PlacedPart, ToolCallPart };
export { makesNoteOfTextBefore, placementOf, TOOL_PARTS };
