// For server tests of the chat's commands: runs one in a conversation as
// the signed-in user, as the composer or a quest panel control sends it, and
// reads the command notes the conversation holds.

import { listMessages } from "@/chats/store.ts";
import type { ChatId, UserId } from "@/ids.ts";
import {
  runChatCommandAction,
  type TasksActionResult,
} from "@/tasks/tasks-actions.ts";
import { type CommandNoteData, readTasksPart } from "@/tasks/tasks-message.ts";

// Runs text in the chat as the signed-in user, dated localDate when given.
function runCommand(
  chatId: ChatId,
  text: string,
  localDate?: string,
): Promise<TasksActionResult> {
  return runChatCommandAction({ chatId, text, localDate });
}

// The command notes in the chat, oldest first, as user reads it.
async function commandNotes(
  user: UserId,
  chatId: ChatId,
): Promise<CommandNoteData[]> {
  const messages = await listMessages(user, chatId);
  const notes: CommandNoteData[] = [];
  for (const message of messages) {
    for (const part of message.parts) {
      const read = readTasksPart(part);
      if (read?.kind === "note") {
        notes.push(read.data);
      }
    }
  }
  return notes;
}

export { commandNotes, runCommand };
