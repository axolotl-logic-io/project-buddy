"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { startChat } from "@/chats/start-chat.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import { createProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const CREATE_PROJECT_FORM = z.object({
  name: z
    .string({ error: COPY.projects.needsName })
    .trim()
    .min(1, { error: COPY.projects.needsName }),
});

// The new-project form's state: as first shown, or after a submission
// without a name. A storage failure throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string };

// Creates the project and its first chat, with the default persona, then
// opens the chat, where the tutor's opening starts the project's interview.
// Or says what the form is missing.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: COPY.projects.needsName };
  }

  const project = await createProject(form.data.name);
  const chat = await startChat(project, DEFAULT_PERSONA_ID);
  return redirect(`/chats/${chat.id}`);
}
