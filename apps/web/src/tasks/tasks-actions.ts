"use server";

import { generateId } from "ai";
import { refresh } from "next/cache";
import { z } from "zod";
// The Server Actions that change a quest's tasks without the construct: from
// the quest's page, from the Tasks panel and tasks cards in an adventure, and
// from the composer's commands. None calls a model. A
// command saves a task message to the conversation. Direct controls return
// the updated tasks for local feedback without adding a message.
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { requireUser } from "@/auth/current-user.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, withAuthor } from "@/chats/message-author.ts";
import {
  chatAwaitsReply,
  getChat,
  readMessageAuthor,
  saveTasksMessage,
} from "@/chats/store.ts";
import {
  CHAT_ID,
  type ChatId,
  QUEST_ID,
  type QuestId,
  type UserId,
} from "@/ids.ts";
import type { StatusActionState } from "@/quests/quest-status.ts";
import { questStatusCommand } from "@/quests/quest-status-commands.ts";
import { getQuest } from "@/quests/store.ts";
import {
  TASKS_OPERATION,
  type TasksChangeLine,
  type TasksState,
  type TasksUndoOperation,
} from "@/tasks/tasks.ts";
import { parseTasksCommand } from "@/tasks/tasks-commands.ts";
import { tasksCardMessage, tasksChangeMessage } from "@/tasks/tasks-message.ts";
import {
  changeTasks,
  readTasksState,
  type TasksChangeFailure,
  type TasksChangeOutcome,
  undoableChanges,
  undoTasksChange,
} from "@/tasks/tasks-store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { CHAT_COMMANDS_COPY } from "@/ui/copy/tasks.ts";

// The most operations one request may make, as many as the construct's.
const MOST_OPERATIONS = 40;

// How many of the user's changes in an adventure /undo looks back through
// for one with something left to undo.
const MOST_UNDO_TRIES = 10;

// The longest command text read; a longer one can't be a valid command.
const MOST_COMMAND_LENGTH = 2000;

const CHANGE_REQUEST = z.object({
  questId: QUEST_ID,
  chatId: CHAT_ID.optional(),
  operations: z.array(TASKS_OPERATION).min(1).max(MOST_OPERATIONS),
});

const UNDO_REQUEST = z.object({
  questId: QUEST_ID,
  chatId: CHAT_ID.optional(),
  version: z.number().int().positive(),
});

const COMMAND_REQUEST = z.object({
  chatId: CHAT_ID,
  text: z.string().min(1).max(MOST_COMMAND_LENGTH),
});

// What an action did: changed the tasks, with the tasks after it and, in an
// adventure, the tasks message it saved there; showed the tasks as a card;
// changed nothing, with why and the tasks as they are; or found a problem with
// a command, in words to show; or found no quest or adventure open to the
// user.
type TasksActionResult =
  | { readonly kind: "quest-status"; readonly feedback: StatusActionState }
  | {
      readonly kind: "changed";
      readonly version: number;
      readonly lines: readonly TasksChangeLine[];
      readonly state: TasksState;
      readonly message?: ChatMessage | undefined;
    }
  | {
      readonly kind: "shown";
      readonly state: TasksState;
      readonly message: ChatMessage;
    }
  | {
      readonly kind: "failed";
      readonly reason: TasksChangeFailure;
      readonly state: TasksState;
    }
  | { readonly kind: "problem"; readonly text: string }
  | { readonly kind: "not-found" };

const NOT_FOUND: TasksActionResult = { kind: "not-found" };

// The user's chat with this id when it is in the quest; undefined
// otherwise.
async function chatInQuest(
  user: UserId,
  questId: QuestId,
  chatId: ChatId,
): Promise<Chat | undefined> {
  const chat = await getChat(user, chatId);
  if (chat?.quest.id !== questId) {
    return undefined;
  }
  return chat;
}

// Saves message in the chat, written by the user, and answers with it as the
// chat shows it; undefined if it couldn't be saved.
async function savedMessage(
  user: UserId,
  chatId: ChatId,
  message: ChatMessage,
): Promise<ChatMessage | undefined> {
  const [saved, author] = await Promise.all([
    saveTasksMessage(user, chatId, message),
    readMessageAuthor(user),
  ]);
  if (!saved) {
    return undefined;
  }
  if (author === undefined) {
    return message;
  }
  return withAuthor(message, author);
}

// The outcome as an action's result, with the tasks message it saves in the
// chat, if it changed the tasks from one.
async function answer(
  user: UserId,
  chatId: ChatId | undefined,
  outcome: TasksChangeOutcome,
  command?: string,
): Promise<TasksActionResult> {
  if (outcome === undefined) {
    return NOT_FOUND;
  }
  if (outcome.kind === "failed") {
    return outcome;
  }
  const { version, lines, undoesVersion } = outcome.change;
  if (chatId === undefined) {
    refresh();
    return { kind: "changed", version, lines, state: outcome.state };
  }
  const message = await savedMessage(
    user,
    chatId,
    tasksChangeMessage(generateId(), {
      version,
      lines: [...lines],
      command,
      undoesVersion,
    }),
  );
  return { kind: "changed", version, lines, state: outcome.state, message };
}

// Changes the tasks of a quest open to the signed-in user, from its page or,
// with chatId, from one of its adventures.
async function changeTasksAction(request: unknown): Promise<TasksActionResult> {
  const user = await requireUser();
  const parsed = CHANGE_REQUEST.safeParse(request);
  if (!parsed.success) {
    return NOT_FOUND;
  }
  const { questId, chatId, operations } = parsed.data;
  if (
    chatId !== undefined &&
    (await chatInQuest(user.id, questId, chatId)) === undefined
  ) {
    return NOT_FOUND;
  }
  const outcome = await changeTasks(
    user.id,
    { questId, chatId, author: "person" },
    operations,
  );
  return answer(user.id, undefined, outcome);
}

// Undoes a change to the tasks of a quest open to the signed-in user, made by
// anyone, from its page or, with chatId, from one of its adventures.
async function undoTasksChangeAction(
  request: unknown,
): Promise<TasksActionResult> {
  const user = await requireUser();
  const parsed = UNDO_REQUEST.safeParse(request);
  if (!parsed.success) {
    return NOT_FOUND;
  }
  const { questId, chatId, version } = parsed.data;
  if (
    chatId !== undefined &&
    (await chatInQuest(user.id, questId, chatId)) === undefined
  ) {
    return NOT_FOUND;
  }
  const outcome = await undoTasksChange(
    user.id,
    { questId, chatId, author: "person" },
    version,
  );
  return answer(user.id, undefined, outcome);
}

async function showTasks(
  user: UserId,
  chat: Chat,
  questId: QuestId,
  command: string,
): Promise<TasksActionResult> {
  const state = await readTasksState(user, questId);
  if (state === undefined) {
    return NOT_FOUND;
  }
  const message = await savedMessage(
    user,
    chat.id,
    tasksCardMessage(generateId(), { command }),
  );
  if (message === undefined) {
    return NOT_FOUND;
  }
  return { kind: "shown", state, message };
}

// Undoes the user's newest change in the adventure that has something left
// to undo: a newer one whose tasks were all changed or removed since is
// passed over, so /undo never sticks on it.
async function undoLatest(
  user: UserId,
  chat: Chat,
  questId: QuestId,
  command: string,
): Promise<TasksActionResult> {
  const versions = await undoableChanges(
    user,
    { questId, chatId: chat.id },
    MOST_UNDO_TRIES,
  );
  const outcome = await undoFirstOf(user, chat, questId, versions);
  if (outcome !== "none") {
    return answer(user, chat.id, outcome, command);
  }
  const state = await readTasksState(user, questId);
  if (state === undefined) {
    return NOT_FOUND;
  }
  return { kind: "failed", reason: "no-such-change", state };
}

// Undoes the first of versions, newest first, that has something left to
// undo; "none" if none has. They are tried in turn, not at once, so only
// one is undone.
async function undoFirstOf(
  user: UserId,
  chat: Chat,
  questId: QuestId,
  versions: readonly number[],
): Promise<TasksChangeOutcome | "none"> {
  const [version, ...older] = versions;
  if (version === undefined) {
    return "none";
  }
  const outcome = await undoTasksChange(
    user,
    { questId, chatId: chat.id, author: "person" },
    version,
  );
  if (
    outcome?.kind === "failed" &&
    (outcome.reason === "nothing-to-undo" ||
      outcome.reason === "already-undone")
  ) {
    return undoFirstOf(user, chat, questId, older);
  }
  return outcome;
}

// The command's operations, run as a change from the chat.
async function runOperations(
  user: UserId,
  chat: Chat,
  questId: QuestId,
  command: {
    readonly text: string;
    readonly operations: readonly TasksUndoOperation[];
  },
): Promise<TasksActionResult> {
  const outcome = await changeTasks(
    user,
    { questId, chatId: chat.id, author: "person" },
    command.operations,
  );
  return answer(user, chat.id, outcome, command.text);
}

// Runs a built-in command typed in an adventure open to the signed-in
// user (src/tasks/tasks-commands.ts), without the construct.
async function runChatCommandAction(
  request: unknown,
): Promise<TasksActionResult> {
  const user = await requireUser();
  const parsed = COMMAND_REQUEST.safeParse(request);
  if (!parsed.success) {
    return NOT_FOUND;
  }
  const { chatId } = parsed.data;
  const text = parsed.data.text.trim();
  const chat = await getChat(user.id, chatId);
  if (chat === undefined) {
    return NOT_FOUND;
  }
  const questId = chat.quest.id;
  const status = questStatusCommand(text);
  if (status !== undefined) {
    const quest = await getQuest(user.id, questId);
    if (quest === undefined) {
      return { kind: "problem", text: QUEST_STATUS_COPY.noQuest };
    }
    const form = new FormData();
    form.set("questId", quest.id);
    form.set("fromStatus", quest.status);
    form.set("toStatus", status);
    form.set("revision", String(quest.statusRevision));
    const feedback = await changeQuestStatusAction({ kind: "idle" }, form);
    if (feedback.kind !== "saved") {
      return {
        kind: "problem",
        text: feedback.message ?? QUEST_STATUS_COPY.failed,
      };
    }
    return { kind: "quest-status", feedback };
  }

  const command = parseTasksCommand(text, { items: [], nextNumber: 1 });
  if (command.kind === "problem" && command.problem.kind === "unknown") {
    return {
      kind: "problem",
      text: CHAT_COMMANDS_COPY.problem(command.problem),
    };
  }
  const state = await readTasksState(user.id, questId);
  if (state === undefined) {
    return NOT_FOUND;
  }
  // Every tasks command saves a message to the adventure, which must not
  // come between a message and the reply it awaits.
  if (await chatAwaitsReply(user.id, chat.id)) {
    return { kind: "failed", reason: "awaiting-reply", state };
  }
  const tasksCommand = parseTasksCommand(text, state.tasks);
  switch (tasksCommand.kind) {
    case "problem":
      return {
        kind: "problem",
        text: CHAT_COMMANDS_COPY.problem(tasksCommand.problem),
      };
    case "show":
      return showTasks(user.id, chat, questId, text);
    case "undo":
      return undoLatest(user.id, chat, questId, text);
    case "change":
      return runOperations(user.id, chat, questId, {
        text,
        operations: tasksCommand.operations,
      });
    default:
      return tasksCommand satisfies never;
  }
}

export type { TasksActionResult };
export { changeTasksAction, runChatCommandAction, undoTasksChangeAction };
