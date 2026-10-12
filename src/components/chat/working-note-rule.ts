// Which of the tutor's text is a working note rather than its answer, read
// from where the text sits among the message's parts. The rule is
// presentational: it reads the parts as they are saved and streamed.
import type { MessageRuntimeState } from "@assistant-ui/react";
import { type PlacedPart, placementOf } from "@/components/chat/tool-parts.tsx";

// What isWorkingNote reads of a message.
interface NoteMessage {
  readonly role: MessageRuntimeState["role"];
  readonly parts: readonly PlacedPart[];
}

// Whether part makes the tutor's text before it a working note: an inline
// tool part whose entry says so.
function makesNoteOfTextBefore(part: PlacedPart): boolean {
  const placement = placementOf(part);
  return (
    placement?.placement === "inline" && placement.textBefore === "working-note"
  );
}

// Whether the run of text parts at runIndices in message is a working note:
// text the tutor wrote before a later tool part that shows inline and whose
// entry makes the text before it a note, rather than its answer. Parts shown
// under the message, such as the citations, and calls the chat doesn't show
// don't count. The user's messages are never notes. While a reply streams,
// its last text is not a note until such a tool part arrives after it.
function isWorkingNote(
  message: NoteMessage,
  runIndices: readonly number[],
): boolean {
  const runEnd = runIndices.at(-1);
  if (message.role !== "assistant" || runEnd === undefined) {
    return false;
  }
  return message.parts.slice(runEnd + 1).some(makesNoteOfTextBefore);
}

export type { NoteMessage };
export { isWorkingNote };
