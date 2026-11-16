// The messages a person adds to a chat without the construct: a change they
// made to the tasks, by command or with the Tasks panel; a Tasks card the
// /tasks command shows; and a command note, which any other command saves
// with what it did. Each is a user message whose one part is a data part,
// saved in the chat so everyone in it, and the construct on its next reply,
// sees it. No reply answers one. It imports nothing from the server, because
// the chat in the browser reads the same parts.

import type { UIMessage } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/chats/message-author.ts";
import { TASKS_CHANGE_LINE } from "@/tasks/tasks.ts";

// The data part names, as the AI SDK stores them: `data-` and a name.
const TASKS_CHANGE_PART = "data-tasks-change";
const TASKS_CARD_PART = "data-tasks-card";
const COMMAND_NOTE_PART = "data-command-note";

// A tasks change a person made in the chat: the version it saved, what it
// did, the command they typed for it, if they typed one, and the version it
// undid, if it was an undo.
const TASKS_CHANGE_DATA = z.object({
  version: z.number().int().positive(),
  lines: z.array(TASKS_CHANGE_LINE),
  command: z.string().optional(),
  undoesVersion: z.number().int().positive().optional(),
});

// A tasks card: the tasks, as it is whenever the card is shown, which the
// command it answers asked for.
const TASKS_CARD_DATA = z.object({ command: z.string() });

// A command note: the command a person sent, as they or a quest panel
// control wrote it, and one line saying what it did.
const COMMAND_NOTE_DATA = z.object({
  command: z.string(),
  note: z.string(),
});

type TasksChangeData = z.infer<typeof TASKS_CHANGE_DATA>;
type TasksCardData = z.infer<typeof TASKS_CARD_DATA>;
type CommandNoteData = z.infer<typeof COMMAND_NOTE_DATA>;

// A tasks message's one part, as the chat reads it.
type TasksMessagePart =
  | { readonly kind: "change"; readonly data: TasksChangeData }
  | { readonly kind: "card"; readonly data: TasksCardData }
  | { readonly kind: "note"; readonly data: CommandNoteData };

// The part as a task message's part, or undefined for any other part.
function readTasksPart(part: {
  readonly type: string;
  readonly data?: unknown;
}): TasksMessagePart | undefined {
  if (part.type === TASKS_CHANGE_PART) {
    const { data } = TASKS_CHANGE_DATA.safeParse(part.data);
    if (data !== undefined) {
      return { kind: "change", data };
    }
  }
  if (part.type === TASKS_CARD_PART) {
    const { data } = TASKS_CARD_DATA.safeParse(part.data);
    if (data !== undefined) {
      return { kind: "card", data };
    }
  }
  if (part.type === COMMAND_NOTE_PART) {
    const { data } = COMMAND_NOTE_DATA.safeParse(part.data);
    if (data !== undefined) {
      return { kind: "note", data };
    }
  }
  return undefined;
}

// Whether the message is a task message: a user message holding only tasks
// parts.
function isTasksMessage(message: Pick<UIMessage, "role" | "parts">): boolean {
  return (
    message.role === "user" &&
    message.parts.length > 0 &&
    message.parts.every((part) => readTasksPart(part) !== undefined)
  );
}

// Whether a reply answers the message: a user message that isn't a tasks
// message.
function awaitsReply(message: Pick<UIMessage, "role" | "parts">): boolean {
  return message.role === "user" && !isTasksMessage(message);
}

// A new tasks message with this id, holding the change.
function tasksChangeMessage(id: string, data: TasksChangeData): ChatMessage {
  return { id, role: "user", parts: [{ type: TASKS_CHANGE_PART, data }] };
}

// A new tasks message with this id, holding a Tasks card.
function tasksCardMessage(id: string, data: TasksCardData): ChatMessage {
  return { id, role: "user", parts: [{ type: TASKS_CARD_PART, data }] };
}

// A new command note message with this id.
function commandNoteMessage(id: string, data: CommandNoteData): ChatMessage {
  return { id, role: "user", parts: [{ type: COMMAND_NOTE_PART, data }] };
}

export type { CommandNoteData };
export {
  awaitsReply,
  COMMAND_NOTE_PART,
  commandNoteMessage,
  isTasksMessage,
  readTasksPart,
  TASKS_CARD_PART,
  TASKS_CHANGE_PART,
  tasksCardMessage,
  tasksChangeMessage,
};
