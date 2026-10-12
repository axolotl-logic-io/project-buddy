"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { startChat } from "@/chats/start-chat.ts";
import { type ProjectId, parseProjectId } from "@/ids.ts";
import { PERSONA_IDS, type PersonaId } from "@/personas/persona.ts";
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

// The new-chat form's state: as first shown, after a submission without a
// known project or a valid persona, or after Claude couldn't open the chat,
// so nothing was started and the form shows her choices again. A storage
// failure throws, for the error boundary.
export type StartChatState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: string;
      readonly projectId: ProjectId;
      readonly personaId: PersonaId;
    };

// Starts the chat, with the tutor's opening, and opens it. Or says what the
// form is missing, or that Claude is unavailable.
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
  const started = await startChat(project, form.data.personaId);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: COPY.opening.claudeUnavailable,
      projectId: project.id,
      personaId: form.data.personaId,
    };
  }
  return redirect(`/chats/${started.chat.id}`);
}
