"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CHAT_NAME_MAX_LENGTH, parseChatName } from "@/chats/chat-name.ts";
import { renameChat } from "@/chats/store.ts";
import { CHAT_ID } from "@/ids.ts";
import { COPY } from "@/ui/copy.ts";

const RENAME_CHAT_FORM = z.object({ chatId: CHAT_ID, name: z.string() });

// What a rename did: renamed the chat, or refused her name, saying why. A
// storage failure throws, for the error boundary.
type RenameChatResult =
  | { readonly kind: "renamed" }
  | { readonly kind: "invalid"; readonly message: string };

// The rename form's state: as first shown, or after a rename.
type RenameChatState = { readonly kind: "idle" } | RenameChatResult;

// Why a name that isn't a chat name won't do.
function refusal(name: string): string {
  if (name.trim() === "") {
    return COPY.chatName.needsName;
  }
  return COPY.chatName.tooLong(CHAT_NAME_MAX_LENGTH);
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
  const name = parseChatName(form.data.name);
  if (name === undefined) {
    return { kind: "invalid", message: refusal(form.data.name) };
  }
  await renameChat(form.data.chatId, name);
  refresh();
  return { kind: "renamed" };
}
