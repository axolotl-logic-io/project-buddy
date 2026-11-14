"use server";

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/auth/current-user.ts";
import { getChat } from "@/chats/store.ts";
import { resetConversation } from "@/conversations/reset-conversation.ts";
import { CHAT_ID } from "@/ids.ts";

async function resetConversationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = CHAT_ID.safeParse(formData.get("chatId"));
  if (!id.success) {
    notFound();
  }
  const conversation = await getChat(user.id, id.data);
  if (
    conversation?.quest === undefined ||
    (await resetConversation(user.id, id.data, {
      clearSteps: formData.get("clearSteps") === "on",
      clearIdeas: formData.get("clearIdeas") === "on",
    })) === undefined
  ) {
    notFound();
  }
  if (conversation.quest !== undefined) {
    redirect(`/quests/${conversation.quest.id}?section=conversation`);
  }
  redirect("/quests");
}

export { resetConversationAction };
