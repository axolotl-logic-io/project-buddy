"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createChat } from "@/chats/store.ts";
import { parseProjectId } from "@/ids.ts";
import { PERSONA_IDS } from "@/personas/persona.ts";

const CHOOSE_PROJECT = "Choose a project for the chat.";

const START_CHAT_FORM = z.object({
  projectId: z.string({ error: CHOOSE_PROJECT }).transform((value, context) => {
    const projectId = parseProjectId(value);
    if (projectId === undefined) {
      context.addIssue({ code: "custom", message: CHOOSE_PROJECT });
      return z.NEVER;
    }
    return projectId;
  }),
  personaId: z.enum(PERSONA_IDS, { error: "Choose a persona for the chat." }),
});

export async function startChatAction(formData: FormData): Promise<void> {
  const form = START_CHAT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    throw new Error(z.prettifyError(form.error));
  }

  const chat = await createChat(form.data);
  redirect(`/chats/${chat.id}`);
}
