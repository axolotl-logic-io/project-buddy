"use server";

import { RedirectType, redirect } from "next/navigation";
import { z } from "zod";
import { revalidateWorkspace } from "@/app/revalidate-workspace.ts";
import { requireUser } from "@/auth/current-user.ts";
import { QUEST_ID } from "@/ids.ts";
import { checkQuestName, QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { startQuest } from "@/quests/store.ts";
import { NEW_QUEST_COPY } from "@/ui/copy/quests.ts";

// The browser makes the new quest's id, so it can open the quest before
// this replies.
const START_REQUEST = z.object({
  id: QUEST_ID,
  name: z.string(),
  motivation: z.string().trim().default(""),
});

// Starts a new quest with its name and the user's optional Why, which its
// construct reads as the quest's starting context, and opens it in place
// of the page the browser showed for it. Otherwise it answers why nothing
// started: the request or the name is wrong, or a quest has its id.
export async function startQuestAction(request: unknown): Promise<string> {
  const user = await requireUser();
  const parsed = START_REQUEST.safeParse(request);
  if (!parsed.success) {
    return NEW_QUEST_COPY.invalid;
  }
  const { id, name, motivation } = parsed.data;
  const checked = checkQuestName(name);
  if (checked.kind !== "named") {
    return NEW_QUEST_COPY.nameProblem(checked.kind, QUEST_NAME_MAX_LENGTH);
  }
  const quest = await startQuest(user.id, id, checked.name, {
    startingContext: motivation,
  });
  if (quest === undefined) {
    return NEW_QUEST_COPY.failed;
  }
  revalidateWorkspace();
  redirect(`/quests/${quest.id}`, RedirectType.push);
}
