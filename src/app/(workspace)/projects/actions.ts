"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createChat, saveMessage } from "@/chats/store.ts";
import { PERSONA_IDS } from "@/personas/persona.ts";
import { createProject } from "@/projects/store.ts";
import { writeInterviewOpening } from "@/tutor/interview-opening.ts";
import { COPY } from "@/ui/copy.ts";

const CREATE_PROJECT_FORM = z.object({
  name: z
    .string({ error: COPY.projects.needsName })
    .trim()
    .min(1, { error: COPY.projects.needsName }),
  personaId: z.enum(PERSONA_IDS, { error: COPY.interview.choosePersona }),
});

// The new-project form's state: as first shown, or after a submission
// without a name or a persona. A storage failure throws, for the error
// boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string };

// Creates the project and its first chat, the interview, in the chosen
// persona, with the tutor's opening question saved in it, then opens the
// chat. Or says what the form is missing.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    const [firstIssue] = form.error.issues;
    return {
      kind: "invalid",
      message: firstIssue?.message ?? COPY.projects.needsName,
    };
  }

  const project = await createProject(form.data.name);
  const chat = await createChat({
    projectId: project.id,
    personaId: form.data.personaId,
  });
  const opening = await writeInterviewOpening({
    ...chat,
    projectName: project.name,
  });
  await saveMessage(chat.id, opening);
  return redirect(`/chats/${chat.id}`);
}
