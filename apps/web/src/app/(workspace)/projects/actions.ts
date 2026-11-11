"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { userMessage } from "@/errors/app-error.ts";
import { PREMADE_QUESTS } from "@/projects/premade-quests.ts";
import {
  checkProjectName,
  PROJECT_NAME_MAX_LENGTH,
} from "@/projects/project-name.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY, QUEST_START_COPY } from "@/ui/copy/projects.ts";

const START_DETAILS = z.object({
  premadeId: z.enum(["dailies", "learn", "make", "do"]),
  name: z.string(),
  journal: z.string().trim(),
  constructId: z.string(),
});

// What came of starting: nothing yet, or why nothing started. A start
// that succeeds opens the quest instead.
type StartQuestState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "invalid" | "claudeUnavailable" | "outOfGold";
      readonly message: string;
    };

// The one way to start a quest, from any of its four starting points: an
// ordinary quest, with its conversation and opening, then opens it.
// Dailies resumes the user's one Dailies quest if they have it, changing
// nothing and spending nothing. The construct is checked for the acting
// user, never trusted from the form; the activity is the starting point's
// own, which the construct can change later. A failure saves nothing.
export async function startQuestAction(
  _previous: StartQuestState,
  data: FormData,
): Promise<StartQuestState> {
  const user = await requireUser();
  const parsed = START_DETAILS.safeParse(Object.fromEntries(data));
  if (!parsed.success) {
    return { kind: "invalid", message: QUEST_START_COPY.invalid };
  }
  const { premadeId, name, journal, constructId } = parsed.data;
  const checked = checkProjectName(name);
  if (checked.kind !== "named") {
    let message: string = PROJECTS_COPY.needsName;
    if (checked.kind === "tooLong") {
      message = PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH);
    }
    return { kind: "invalid", message };
  }
  const premade = PREMADE_QUESTS.find(({ id }) => id === premadeId);
  const construct = await chosenConstruct(user.id, constructId);
  if (premade === undefined || construct === undefined) {
    return { kind: "invalid", message: QUEST_START_COPY.invalid };
  }
  const activity = builtInActivity(premade.activityId);
  const details = {
    name: checked.name,
    journal,
    construct: construct.construct,
    activity,
  };
  let result: Awaited<ReturnType<typeof startDailies>>;
  if (premadeId === "dailies") {
    result = await startDailies(user.id, details);
  } else {
    result = await startProject(user.id, checked.name, construct.construct, {
      journal,
      activity,
    });
  }
  if (result.kind === "claudeUnavailable") {
    return { kind: result.kind, message: OPENING_COPY.claudeUnavailable };
  }
  if (result.kind === "outOfGold") {
    return { kind: result.kind, message: userMessage("out-of-gold") };
  }
  redirect(`/projects/${result.chat.project.id}`);
}

export type { StartQuestState };
