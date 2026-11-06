"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { startProject } from "@/chats/start-chat.ts";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
import { userMessage } from "@/errors/app-error.ts";
import {
  checkProjectName,
  PROJECT_NAME_MAX_LENGTH,
} from "@/projects/project-name.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY, QUEST_LIBRARY_COPY } from "@/ui/copy/projects.ts";

const STARTING_DETAILS = z.object({
  name: z.string(),
  motivation: z.string().trim(),
  journal: z.string().trim(),
  activityId: z.string(),
  constructId: z.string(),
});

type PremadeQuestState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "invalid" | "claudeUnavailable" | "outOfGold";
      readonly message: string;
    };

// Only confirmed details enter the ordinary atomic creation flow. Availability
// is checked for the acting user, never trusted from the preview's choices.
async function startPremadeQuestAction(
  _previous: PremadeQuestState,
  data: FormData,
): Promise<PremadeQuestState> {
  const user = await requireUser();
  const parsed = STARTING_DETAILS.safeParse(Object.fromEntries(data));
  if (!parsed.success) {
    return { kind: "invalid", message: QUEST_LIBRARY_COPY.invalid };
  }
  const { name, motivation, journal, activityId, constructId } = parsed.data;
  const checked = checkProjectName(name);
  if (checked.kind !== "named") {
    let message: string = PROJECTS_COPY.needsName;
    if (checked.kind === "tooLong") {
      message = PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH);
    }
    return { kind: "invalid", message };
  }
  const [activity, construct] = await Promise.all([
    chosenActivity(user.id, activityId),
    chosenConstruct(user.id, constructId),
  ]);
  if (activity === undefined || construct === undefined) {
    return { kind: "invalid", message: QUEST_LIBRARY_COPY.invalid };
  }
  const result = await startProject(
    user.id,
    checked.name,
    construct.construct,
    {
      motivation,
      journal,
      activity,
    },
  );
  if (result.kind === "claudeUnavailable") {
    return { kind: result.kind, message: OPENING_COPY.claudeUnavailable };
  }
  if (result.kind === "outOfGold") {
    return { kind: result.kind, message: userMessage("out-of-gold") };
  }
  redirect(`/chats/${result.chat.id}`);
}

export type { PremadeQuestState };
export { startPremadeQuestAction };
