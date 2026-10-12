"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { startProject } from "@/chats/start-chat.ts";
import { COPY } from "@/ui/copy.ts";

const CREATE_PROJECT_FORM = z.object({
  name: z
    .string({ error: COPY.projects.needsName })
    .trim()
    .min(1, { error: COPY.projects.needsName }),
});

// The new-project form's state: as first shown, after a submission without
// a name, or after Claude couldn't open the project's first chat, so nothing
// was created and the form shows the name she typed again. A storage failure
// throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: string;
      readonly name: string;
    };

// Creates the project and its first chat, with the default persona, then
// opens the chat, where the tutor's opening starts the project's interview.
// Or says what the form is missing, or that Claude is unavailable.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: COPY.projects.needsName };
  }

  const started = await startProject(form.data.name);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: COPY.opening.claudeUnavailable,
      name: form.data.name,
    };
  }
  return redirect(`/chats/${started.chat.id}`);
}
