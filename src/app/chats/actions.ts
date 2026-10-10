"use server";

import { redirect } from "next/navigation";
import { createChat } from "@/chats/store.ts";
import { isPersonaId } from "@/personas/index.ts";

export async function startChatAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const personaId = String(formData.get("personaId") ?? "");
  if (!projectId) {
    throw new Error("Choose a project for the chat.");
  }
  if (!isPersonaId(personaId)) {
    throw new Error(`Unknown persona "${personaId}".`);
  }

  const chat = await createChat({ projectId, personaId });
  redirect(`/chats/${chat.id}`);
}
