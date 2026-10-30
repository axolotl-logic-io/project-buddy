"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  currentActivity,
  enterActivity,
} from "@/activities/activity-sessions.ts";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import {
  CHAT_NAME_MAX_LENGTH,
  type ChatNameProblem,
  checkChatName,
} from "@/chats/chat-name.ts";
import { getChat, listMessages, renameChat } from "@/chats/store.ts";
import { CHAT_ID, parseMessageId } from "@/ids.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";

const RENAME_CHAT_FORM = z.object({ chatId: CHAT_ID, name: z.string() });

const CHANGE_ACTIVITY_FORM = z.object({
  chatId: CHAT_ID,
  activityId: z.string(),
});

// What a rename did: renamed the chat, or refused her name, saying why. A
// storage failure throws, for the error boundary.
type RenameChatResult =
  | { readonly kind: "renamed" }
  | { readonly kind: "invalid"; readonly message: string };

// The rename form's state: as first shown, or after a rename.
type RenameChatState = { readonly kind: "idle" } | RenameChatResult;

// What the form says for a refused name.
function refusal(problem: ChatNameProblem): string {
  switch (problem) {
    case "empty":
      return CHAT_NAME_COPY.needsName;
    case "multi-line":
      return CHAT_NAME_COPY.multiLine;
    case "too-long":
      return CHAT_NAME_COPY.tooLong(CHAT_NAME_MAX_LENGTH);
    default: {
      const unhandled: never = problem;
      return unhandled;
    }
  }
}

export type { RenameChatResult, RenameChatState };

// Renames the chat to her name, after which Claude Haiku never renames it,
// or says why the name won't do. A chat whose id is malformed, unknown or
// another user's is not found.
export async function renameChatAction(
  _state: RenameChatState,
  formData: FormData,
): Promise<RenameChatResult> {
  const user = await requireUser();
  const form = RENAME_CHAT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const check = checkChatName(form.data.name);
  if (check.kind === "refused") {
    return { kind: "invalid", message: refusal(check.problem) };
  }
  if (!(await renameChat(user.id, form.data.chatId, check.name))) {
    notFound();
  }
  refresh();
  return { kind: "renamed" };
}

// Changes the chat's current activity to the one she chose, from after the
// chat's latest message, then shows the chat with it. A chat whose id is
// malformed, unknown or another user's, an activity that is none of hers,
// and the interview in a chat with no project are not found.
export async function changeActivityAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const form = CHANGE_ACTIVITY_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const [chat, activity] = await Promise.all([
    getChat(user.id, form.data.chatId),
    chosenActivity(user.id, form.data.activityId),
  ]);
  if (
    chat === undefined ||
    activity === undefined ||
    (activity.id === INTERVIEW_ACTIVITY_ID && chat.project === undefined)
  ) {
    notFound();
  }
  if ((await currentActivity(user.id, chat)).id === activity.id) {
    return;
  }
  const latest = (await listMessages(user.id, chat.id)).at(-1);
  await enterActivity(
    user.id,
    chat.id,
    activity,
    parseMessageId(latest?.id ?? ""),
  );
  refresh();
}
