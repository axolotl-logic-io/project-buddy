"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { startChat } from "@/chats/start-chat.ts";
import { parseProjectId } from "@/ids.ts";
import { PERSONA_IDS } from "@/personas/persona.ts";
import { getProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const START_CHAT_FORM = z.object({
  projectId: z
    .string({ error: COPY.newChat.chooseProject })
    .transform((value, context) => {
      const projectId = parseProjectId(value);
      if (projectId === undefined) {
        context.addIssue({
          code: "custom",
          message: COPY.newChat.chooseProject,
        });
        return z.NEVER;
      }
      return projectId;
    }),
  personaId: z.enum(PERSONA_IDS, { error: COPY.newChat.choosePersona }),
});

// The new-chat form's state: as first shown, or after a submission without a
// known project or a valid persona. A storage failure throws, for the error
// boundary.
export type StartChatState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string };

// Starts the chat, with the tutor's opening, and opens it. Or says what the
// form is missing.
export async function startChatAction(
  _state: StartChatState,
  formData: FormData,
): Promise<StartChatState> {
  const form = START_CHAT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    const [firstIssue] = form.error.issues;
    return {
      kind: "invalid",
      message: firstIssue?.message ?? COPY.newChat.chooseProject,
    };
  }

  const project = await getProject(form.data.projectId);
  if (project === undefined) {
    return { kind: "invalid", message: COPY.newChat.chooseProject };
  }
  const chat = await startChat(project, form.data.personaId);
  return redirect(`/chats/${chat.id}`);
}
