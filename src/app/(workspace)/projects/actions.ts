"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { NewChatPersona } from "@/chats/new-chat-store.ts";
import { startProject } from "@/chats/start-chat.ts";
import type { UserId, UserPersonaId } from "@/ids.ts";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isPersonaId,
  type PersonaId,
} from "@/personas/index.ts";
import { getUserPersona } from "@/personas/persona-store.ts";
import { OPENING_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const CREATE_PROJECT_FORM = z.object({
  name: z
    .string({ error: PROJECTS_COPY.needsName })
    .trim()
    .min(1, { error: PROJECTS_COPY.needsName }),
  personaId: z.string({ error: PROJECTS_COPY.choosePersona }).optional(),
});

// The persona the form chose, by its id, and the persona the interview chat
// keeps for it: the default persona when the form sent none, a built-in
// persona, or a snapshot of one of the owner's own, saved under the default
// persona's id as a new chat's is. Undefined for anything else, such as
// another user's persona.
async function interviewPersona(
  owner: UserId,
  personaId: string | undefined,
): Promise<
  | { readonly id: PersonaId | UserPersonaId; readonly persona: NewChatPersona }
  | undefined
> {
  if (personaId === undefined) {
    return { id: DEFAULT_PERSONA_ID, persona: getPersona(DEFAULT_PERSONA_ID) };
  }
  if (isPersonaId(personaId)) {
    return { id: personaId, persona: getPersona(personaId) };
  }
  const own = await getUserPersona(owner, personaId);
  if (own === undefined) {
    return undefined;
  }
  return {
    id: own.id,
    persona: { id: DEFAULT_PERSONA_ID, name: own.name, parts: own.parts },
  };
}

// The new-project form's state: as first shown, after a submission without
// a name or with a persona that is neither built-in nor hers, or after
// Claude couldn't open the project's first chat, so nothing was created and
// the form shows the name and persona she chose again, or after her
// monthly quota was found used up, so nothing was created. A storage failure
// throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: string;
      readonly name: string;
      readonly personaId: PersonaId | UserPersonaId;
    }
  | { readonly kind: "quotaUsedUp"; readonly message: string };

// Creates the project and its first chat, in the persona she chose (or the
// default persona when the form sends none), then
// opens the chat, where the tutor's opening starts the project's interview.
// Or says what the form is missing, that Claude is unavailable, or that her
// quota is used up and when it resets.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    const [firstIssue] = form.error.issues;
    return {
      kind: "invalid",
      message: firstIssue?.message ?? PROJECTS_COPY.needsName,
    };
  }

  const chosen = await interviewPersona(user.id, form.data.personaId);
  if (chosen === undefined) {
    return { kind: "invalid", message: PROJECTS_COPY.choosePersona };
  }

  const started = await startProject(user.id, form.data.name, chosen.persona);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: form.data.name,
      personaId: chosen.id,
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
