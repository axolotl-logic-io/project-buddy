"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { startProject } from "@/chats/start-chat.ts";
import { OPENING_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const CREATE_PROJECT_FORM = z.object({
  name: z
    .string({ error: PROJECTS_COPY.needsName })
    .trim()
    .min(1, { error: PROJECTS_COPY.needsName }),
});

// The new-project form's state: as first shown, after a submission without
// a name, or after Claude couldn't open the project's first chat, so nothing
// was created and the form shows the name she typed again, or after her
// monthly quota was found used up, so nothing was created. A storage failure
// throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: string;
      readonly name: string;
    }
  | { readonly kind: "quotaUsedUp"; readonly message: string };

// Creates the project and its first chat, with the default persona, then
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
    return { kind: "invalid", message: PROJECTS_COPY.needsName };
  }

  const started = await startProject(user.id, form.data.name);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: form.data.name,
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
