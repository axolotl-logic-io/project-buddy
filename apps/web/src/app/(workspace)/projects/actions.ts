"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { chosenBuddy } from "@/buddies/chosen-buddy.ts";
import type { BuddyId } from "@/buddies/index.ts";
import { startProject } from "@/chats/start-chat.ts";
import type { OwnPromptId } from "@/ids.ts";
import {
  checkProjectName,
  PROJECT_NAME_MAX_LENGTH,
} from "@/projects/project-name.ts";
import { OPENING_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The form's fields as sent; the name is checked by the shared rule.
const CREATE_PROJECT_FORM = z.object({
  name: z.string().default(""),
  buddyId: z.string({ error: PROJECTS_COPY.chooseBuddy }).optional(),
});

// What the name field says about a name the shared rule refused.
function nameMessage(problem: "missing" | "tooLong"): string {
  if (problem === "tooLong") {
    return PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH);
  }
  return PROJECTS_COPY.needsName;
}

// The new-project form's state: as first shown, after a submission with a
// buddy that is neither built-in nor theirs, after one whose name is
// missing or too long, so the name field says which and the form shows
// their name and buddy again, after Claude couldn't open the project's
// first chat, so nothing was created and the form shows the name and buddy
// they chose again, or after their monthly quota was found used up, so
// nothing was created. A storage failure throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "invalidName" | "claudeUnavailable";
      readonly message: string;
      readonly name: string;
      readonly buddyId: BuddyId | OwnPromptId;
    }
  | { readonly kind: "quotaUsedUp"; readonly message: string };

// Creates the project and its first chat, in the buddy they chose (or the
// default buddy when the form sends none), then opens the chat, where the
// buddy's opening starts the project's interview. Or says what is wrong
// with the form, that Claude is unavailable, or that their quota is used up
// and when it resets.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: PROJECTS_COPY.chooseBuddy };
  }

  const chosen = await chosenBuddy(user.id, form.data.buddyId);
  if (chosen === undefined) {
    return { kind: "invalid", message: PROJECTS_COPY.chooseBuddy };
  }
  const name = checkProjectName(form.data.name);
  if (name.kind !== "named") {
    return {
      kind: "invalidName",
      message: nameMessage(name.kind),
      name: form.data.name,
      buddyId: chosen.id,
    };
  }

  const started = await startProject(user.id, name.name, chosen.buddy);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: name.name,
      buddyId: chosen.id,
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
