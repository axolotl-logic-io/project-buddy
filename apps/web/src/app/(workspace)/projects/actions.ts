"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { chosenBuddy } from "@/buddies/chosen-buddy.ts";
import type { BuddyId } from "@/buddies/index.ts";
import { startProject } from "@/chats/start-chat.ts";
import { userMessage } from "@/errors/app-error.ts";
import type { OwnPromptId } from "@/ids.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The name follows the shared rule; its issues read as needsName through
// the parse's error map, which the buddy's own message overrides.
const CREATE_PROJECT_FORM = z.object({
  name: PROJECT_NAME,
  buddyId: z.string({ error: PROJECTS_COPY.chooseBuddy }).optional(),
});

function needsName(): string {
  return PROJECTS_COPY.needsName;
}

// The new-project form's state: as first shown, after a submission without
// a name or with a buddy that is neither built-in nor hers, or after
// Claude couldn't open the project's first chat, so nothing was created and
// the form shows the name and buddy she chose again, or after she was
// found out of gold, so nothing was created. A storage failure
// throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: string;
      readonly name: string;
      readonly buddyId: BuddyId | OwnPromptId;
    }
  | { readonly kind: "outOfGold"; readonly message: string };

// Creates the project and its first chat, in the buddy she chose (or the
// default buddy when the form sends none), then
// opens the chat, where the buddy's opening starts the project's interview.
// Or says what the form is missing, that Claude is unavailable, or that she
// is out of gold.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData), {
    error: needsName,
  });
  if (!form.success) {
    const [firstIssue] = form.error.issues;
    return {
      kind: "invalid",
      message: firstIssue?.message ?? PROJECTS_COPY.needsName,
    };
  }

  const chosen = await chosenBuddy(user.id, form.data.buddyId);
  if (chosen === undefined) {
    return { kind: "invalid", message: PROJECTS_COPY.chooseBuddy };
  }

  const started = await startProject(user.id, form.data.name, chosen.buddy);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: form.data.name,
      buddyId: chosen.id,
    };
  }
  if (started.kind === "outOfGold") {
    return { kind: "outOfGold", message: userMessage("out-of-gold") };
  }
  return redirect(`/chats/${started.chat.id}`);
}
