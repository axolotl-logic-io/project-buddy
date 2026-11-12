"use server";

import { generateId } from "ai";
import { refresh } from "next/cache";
import { z } from "zod";
// The Server Actions that change a quest's plan without the construct: from
// the quest's page, from the Plan panel and plan cards in an adventure, and
// from the composer's commands. None calls a model or spends batteries. A
// change made in an adventure is saved to it as a plan message, which the
// action answers with so the adventure can show it at once.
import { requireUser } from "@/auth/current-user.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, withAuthor } from "@/chats/message-author.ts";
import {
  chatAwaitsReply,
  getChat,
  readMessageAuthor,
  savePlanMessage,
} from "@/chats/store.ts";
import {
  CHAT_ID,
  type ChatId,
  QUEST_ID,
  type QuestId,
  type UserId,
} from "@/ids.ts";
import {
  PLAN_OPERATION,
  type PlanChangeLine,
  type PlanState,
  type PlanUndoOperation,
} from "@/plan/plan.ts";
import { parsePlanCommand } from "@/plan/plan-commands.ts";
import { planCardMessage, planChangeMessage } from "@/plan/plan-message.ts";
import {
  changePlan,
  type PlanChangeFailure,
  type PlanChangeOutcome,
  readPlanState,
  undoableChanges,
  undoPlanChange,
} from "@/plan/plan-store.ts";
import { CHAT_COMMANDS_COPY } from "@/ui/copy/plan.ts";

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
  operations: z.array(PLAN_OPERATION).min(1).max(MOST_OPERATIONS),
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

// What an action did: changed the plan, with the plan after it and, in an
// adventure, the plan message it saved there; showed the plan as a card;
// changed nothing, with why and the plan as it is; or found a problem with
// a command, in words to show; or found no quest or adventure open to the
// user.
type PlanActionResult =
  | {
      readonly kind: "changed";
      readonly version: number;
      readonly lines: readonly PlanChangeLine[];
      readonly state: PlanState;
      readonly message?: ChatMessage | undefined;
    }
  | {
      readonly kind: "shown";
      readonly state: PlanState;
      readonly message: ChatMessage;
    }
  | {
      readonly kind: "failed";
      readonly reason: PlanChangeFailure;
      readonly state: PlanState;
    }
  | { readonly kind: "problem"; readonly text: string }
  | { readonly kind: "not-found" };

const NOT_FOUND: PlanActionResult = { kind: "not-found" };

// The user's chat with this id when it is in the quest; undefined
// otherwise.
async function chatInQuest(
  user: UserId,
  questId: QuestId,
  chatId: ChatId,
): Promise<Chat | undefined> {
  const chat = await getChat(user, chatId);
  if (chat?.quest?.id !== questId) {
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
    savePlanMessage(user, chatId, message),
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

// The outcome as an action's result, with the plan message it saves in the
// chat, if it changed the plan from one.
async function answer(
  user: UserId,
  chatId: ChatId | undefined,
  outcome: PlanChangeOutcome,
  command?: string,
): Promise<PlanActionResult> {
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
    planChangeMessage(generateId(), {
      version,
      lines: [...lines],
      command,
      undoesVersion,
    }),
  );
  return { kind: "changed", version, lines, state: outcome.state, message };
}

// Changes the plan of a quest open to the signed-in user, from its page or,
// with chatId, from one of its adventures.
async function changePlanAction(request: unknown): Promise<PlanActionResult> {
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
  const outcome = await changePlan(
    user.id,
    { questId, chatId, author: "person" },
    operations,
  );
  return answer(user.id, chatId, outcome);
}

// Undoes a change to the plan of a quest open to the signed-in user, made by
// anyone, from its page or, with chatId, from one of its adventures.
async function undoPlanChangeAction(
  request: unknown,
): Promise<PlanActionResult> {
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
  const outcome = await undoPlanChange(
    user.id,
    { questId, chatId, author: "person" },
    version,
  );
  return answer(user.id, chatId, outcome);
}

async function showPlan(
  user: UserId,
  chat: Chat,
  questId: QuestId,
  command: string,
): Promise<PlanActionResult> {
  const state = await readPlanState(user, questId);
  if (state === undefined) {
    return NOT_FOUND;
  }
  const message = await savedMessage(
    user,
    chat.id,
    planCardMessage(generateId(), { command }),
  );
  if (message === undefined) {
    return NOT_FOUND;
  }
  return { kind: "shown", state, message };
}

// Undoes the user's newest change in the adventure that has something left
// to undo: a newer one whose steps were all changed or removed since is
// passed over, so /undo never sticks on it.
async function undoLatest(
  user: UserId,
  chat: Chat,
  questId: QuestId,
  command: string,
): Promise<PlanActionResult> {
  const versions = await undoableChanges(
    user,
    { questId, chatId: chat.id },
    MOST_UNDO_TRIES,
  );
  const outcome = await undoFirstOf(user, chat, questId, versions);
  if (outcome !== "none") {
    return answer(user, chat.id, outcome, command);
  }
  const state = await readPlanState(user, questId);
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
): Promise<PlanChangeOutcome | "none"> {
  const [version, ...older] = versions;
  if (version === undefined) {
    return "none";
  }
  const outcome = await undoPlanChange(
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
    readonly operations: readonly PlanUndoOperation[];
  },
): Promise<PlanActionResult> {
  const outcome = await changePlan(
    user,
    { questId, chatId: chat.id, author: "person" },
    command.operations,
  );
  return answer(user, chat.id, outcome, command.text);
}

// Runs a built-in command typed in an adventure open to the signed-in
// user (src/plan/plan-commands.ts), without the construct.
async function runChatCommandAction(
  request: unknown,
): Promise<PlanActionResult> {
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
  const questId = chat.quest?.id;
  const command = parsePlanCommand(text, { steps: [], nextNumber: 1 });
  if (command.kind === "problem" && command.problem.kind === "unknown") {
    return {
      kind: "problem",
      text: CHAT_COMMANDS_COPY.problem(command.problem),
    };
  }
  if (questId === undefined) {
    return { kind: "problem", text: CHAT_COMMANDS_COPY.noPlan };
  }
  const state = await readPlanState(user.id, questId);
  if (state === undefined) {
    return NOT_FOUND;
  }
  // Every plan command saves a message to the adventure, which must not
  // come between a message and the reply it awaits.
  if (await chatAwaitsReply(user.id, chat.id)) {
    return { kind: "failed", reason: "awaiting-reply", state };
  }
  const planCommand = parsePlanCommand(text, state.plan);
  switch (planCommand.kind) {
    case "problem":
      return {
        kind: "problem",
        text: CHAT_COMMANDS_COPY.problem(planCommand.problem),
      };
    case "show":
      return showPlan(user.id, chat, questId, text);
    case "undo":
      return undoLatest(user.id, chat, questId, text);
    case "change":
      return runOperations(user.id, chat, questId, {
        text,
        operations: planCommand.operations,
      });
    default:
      return planCommand satisfies never;
  }
}

export type { PlanActionResult };
export { changePlanAction, runChatCommandAction, undoPlanChangeAction };
