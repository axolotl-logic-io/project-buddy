"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import {
  type ChosenConstruct,
  chosenConstruct,
} from "@/constructs/chosen-construct.ts";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { userMessage } from "@/errors/app-error.ts";
import {
  checkProjectName,
  PROJECT_NAME_MAX_LENGTH,
} from "@/projects/project-name.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The form's fields as sent; the name is checked by the shared rule.
const CREATE_PROJECT_FORM = z.object({
  name: z.string().default(PROJECTS_COPY.defaultName),
  motivation: z.string().trim().default(""),
  constructId: z.string().optional(),
});

// What the name field says about a name the shared rule refused.
function nameMessage(problem: "missing" | "tooLong"): string {
  if (problem === "tooLong") {
    return PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH);
  }
  return PROJECTS_COPY.needsName;
}

// Failed openings and invalid names preserve the quest details for correction.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "invalidName" | "claudeUnavailable" | "outOfGold";
      readonly message: string;
      readonly name: string;
      readonly motivation: string;
    };

// Starts with the selected construct, or the account preference for legacy callers.
// The two-field dialog omits a name and receives a valid default.
// Opening failures save nothing; a storage failure reaches the error boundary.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: PROJECTS_COPY.invalidDetails };
  }

  const name = checkProjectName(form.data.name);
  if (name.kind !== "named") {
    return {
      kind: "invalidName",
      message: nameMessage(name.kind),
      name: form.data.name,
      motivation: form.data.motivation,
    };
  }

  let chosen: ChosenConstruct | undefined;
  if (form.data.constructId === undefined) {
    chosen = await interviewConstruct(user.id);
  } else {
    chosen = await chosenConstruct(user.id, form.data.constructId);
  }
  if (chosen === undefined) {
    return { kind: "invalid", message: PROJECTS_COPY.unavailableConstruct };
  }
  const started = await startProject(user.id, name.name, chosen.construct, {
    motivation: form.data.motivation,
  });
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: name.name,
      motivation: form.data.motivation,
    };
  }
  if (started.kind === "outOfGold") {
    return {
      kind: "outOfGold",
      message: userMessage("out-of-gold"),
      name: form.data.name,
      motivation: form.data.motivation,
    };
  }
  return redirect(`/chats/${started.chat.id}`);
}
