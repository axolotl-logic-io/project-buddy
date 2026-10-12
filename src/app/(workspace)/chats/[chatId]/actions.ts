"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  CHAT_NAME_MAX_LENGTH,
  type ChatNameProblem,
  checkChatName,
} from "@/chats/chat-name.ts";
import { renameChat } from "@/chats/store.ts";
import { CHAT_ID } from "@/ids.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";

const RENAME_CHAT_FORM = z.object({ chatId: CHAT_ID, name: z.string() });

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
// or says why the name won't do. A form whose chat id is malformed is not
// found.
export async function renameChatAction(
  _state: RenameChatState,
  formData: FormData,
): Promise<RenameChatResult> {
  const form = RENAME_CHAT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const check = checkChatName(form.data.name);
  if (check.kind === "refused") {
    return { kind: "invalid", message: refusal(check.problem) };
  }
  await renameChat(form.data.chatId, check.name);
  refresh();
  return { kind: "renamed" };
}
