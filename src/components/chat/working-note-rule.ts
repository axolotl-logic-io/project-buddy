// Which of the tutor's text is a working note rather than its answer, read
// from where the text sits among the message's parts. The rule is
// presentational: it reads the parts as they are saved and streamed.
import type { MessageRuntimeState, PartState } from "@assistant-ui/react";
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";

// What isWorkingNote reads of a message's part: its type, and a tool call's
// tool name.
type NotePart =
  | { readonly type: "tool-call"; readonly toolName: string }
  | { readonly type: Exclude<PartState["type"], "tool-call"> };

// What isWorkingNote reads of a message.
interface NoteMessage {
  readonly role: MessageRuntimeState["role"];
  readonly parts: readonly NotePart[];
}

function isInlineToolPart(part: NotePart): boolean {
  return (
    part.type === "tool-call" &&
    TOOL_PARTS.get(part.toolName)?.placement === "inline"
  );
}

// Whether the run of text parts at runIndices in message is a working note:
// text the tutor wrote before a later tool part that shows inline, rather
// than its answer. Parts shown under the message, such as the citations, and
// calls the chat doesn't show don't count. The user's messages are never
// notes. While a reply streams, its last text is not a note until an inline
// tool part arrives after it.
function isWorkingNote(
  message: NoteMessage,
  runIndices: readonly number[],
): boolean {
  const runEnd = runIndices.at(-1);
  if (message.role !== "assistant" || runEnd === undefined) {
    return false;
  }
  return message.parts.slice(runEnd + 1).some(isInlineToolPart);
}

export type { NoteMessage, NotePart };
export { isWorkingNote };
