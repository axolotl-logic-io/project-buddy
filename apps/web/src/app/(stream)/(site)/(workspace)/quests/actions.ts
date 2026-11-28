"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { checkQuestName, QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import { NEW_QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

const START_DETAILS = z.object({
  name: z.string(),
  motivation: z.string().trim().default(""),
});

// What came of starting: nothing yet, or why nothing started. A start
// that succeeds opens the quest instead.
type StartQuestState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "invalid";
      readonly message: string;
    };

// Starts a new quest with its name and the user's optional Why, which
// its construct reads as the quest's starting context.
export async function startQuestAction(
  _previous: StartQuestState,
  data: FormData,
): Promise<StartQuestState> {
  const user = await requireUser();
  const parsed = START_DETAILS.safeParse(Object.fromEntries(data));
  if (!parsed.success) {
    return { kind: "invalid", message: NEW_QUEST_COPY.invalid };
  }
  const { name, motivation } = parsed.data;
  const checked = checkQuestName(name);
  if (checked.kind !== "named") {
    let message: string = QUESTS_COPY.needsName;
    if (checked.kind === "tooLong") {
      message = QUESTS_COPY.nameTooLong(QUEST_NAME_MAX_LENGTH);
    }
    return { kind: "invalid", message };
  }
  const quest = await createQuest(user.id, checked.name, {
    startingContext: motivation,
  });
  redirect(`/quests/${quest.id}`);
}

export type { StartQuestState };
