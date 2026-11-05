"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { startProject } from "@/chats/start-chat.ts";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
import type { ConstructId } from "@/constructs/index.ts";
import { userMessage } from "@/errors/app-error.ts";
import type { OwnPromptId } from "@/ids.ts";
import {
  checkProjectName,
  PROJECT_NAME_MAX_LENGTH,
} from "@/projects/project-name.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The form's fields as sent; the name is checked by the shared rule.
const CREATE_PROJECT_FORM = z.object({
  name: z.string().default(""),
  constructId: z.string({ error: PROJECTS_COPY.chooseConstruct }).optional(),
});

// What the name field says about a name the shared rule refused.
function nameMessage(problem: "missing" | "tooLong"): string {
  if (problem === "tooLong") {
    return PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH);
  }
  return PROJECTS_COPY.needsName;
}

// The new-project form's state: as first shown, after a submission with a
// construct that is neither built-in nor theirs, after one whose name is
// missing or too long, so the name field says which and the form shows
// their name and construct again, after Claude couldn't open the project's
// first chat, so nothing was created and the form shows the name and construct
// they chose again, or after they were found out of gold, so nothing
// was created. A storage failure throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "invalidName" | "claudeUnavailable";
      readonly message: string;
      readonly name: string;
      readonly constructId: ConstructId | OwnPromptId;
    }
  | { readonly kind: "outOfGold"; readonly message: string };

// Creates the project and its first chat, in the construct they chose (or the
// default construct when the form sends none), then opens the chat, where the
// construct's opening starts the project's interview. Or says what is wrong
// with the form, that Claude is unavailable, or that they are out of
// gold.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: PROJECTS_COPY.chooseConstruct };
  }

  const chosen = await chosenConstruct(user.id, form.data.constructId);
  if (chosen === undefined) {
    return { kind: "invalid", message: PROJECTS_COPY.chooseConstruct };
  }
  const name = checkProjectName(form.data.name);
  if (name.kind !== "named") {
    return {
      kind: "invalidName",
      message: nameMessage(name.kind),
      name: form.data.name,
      constructId: chosen.id,
    };
  }

  const started = await startProject(user.id, name.name, chosen.construct);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: name.name,
      constructId: chosen.id,
    };
  }
  if (started.kind === "outOfGold") {
    return { kind: "outOfGold", message: userMessage("out-of-gold") };
  }
  return redirect(`/chats/${started.chat.id}`);
}
