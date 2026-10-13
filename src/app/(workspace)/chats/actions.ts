"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { startChat } from "@/chats/start-chat.ts";
import { type ProjectId, parseProjectId } from "@/ids.ts";
import { PERSONA_IDS, type PersonaId } from "@/personas/persona.ts";
import { getProject } from "@/projects/store.ts";
import {
  NEW_CHAT_COPY,
  OPENING_COPY,
  quotaUsedUpMessage,
} from "@/ui/copy/chat.ts";

const START_CHAT_FORM = z.object({
  projectId: z
    .string({ error: NEW_CHAT_COPY.chooseProject })
    .transform((value, context) => {
      const projectId = parseProjectId(value);
      if (projectId === undefined) {
        context.addIssue({
          code: "custom",
          message: NEW_CHAT_COPY.chooseProject,
        });
        return z.NEVER;
      }
      return projectId;
    }),
  personaId: z.enum(PERSONA_IDS, { error: NEW_CHAT_COPY.choosePersona }),
});

// The new-chat form's state: as first shown, after a submission without a
// known project or a valid persona, or after Claude couldn't open the chat,
// so nothing was started and the form shows her choices again, or after her
// monthly quota was found used up, so nothing was started. A storage failure
// throws, for the error boundary.
export type StartChatState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: string;
      readonly projectId: ProjectId;
      readonly personaId: PersonaId;
    }
  | { readonly kind: "quotaUsedUp"; readonly message: string };

// Starts the chat, with the tutor's opening, and opens it. Or says what the
// form is missing, that Claude is unavailable, or that her quota is used up
// and when it resets. A project of another user's reads as no known project.
export async function startChatAction(
  _state: StartChatState,
  formData: FormData,
): Promise<StartChatState> {
  const user = await requireUser();
  const form = START_CHAT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    const [firstIssue] = form.error.issues;
    return {
      kind: "invalid",
      message: firstIssue?.message ?? NEW_CHAT_COPY.chooseProject,
    };
  }

  const project = await getProject(user.id, form.data.projectId);
  if (project === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseProject };
  }
  const started = await startChat(user.id, project, form.data.personaId);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: project.id,
      personaId: form.data.personaId,
    };
  }
  if (started.kind === "quotaUsedUp") {
    return {
      kind: "quotaUsedUp",
      message: quotaUsedUpMessage(started.resetsOn),
    };
  }
  return redirect(`/chats/${started.chat.id}`);
}
