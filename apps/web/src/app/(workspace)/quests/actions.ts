"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { PREMADE_QUEST_ID } from "@/quests/premade-quests.ts";
import { checkQuestName, QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { startPremadeQuest } from "@/quests/start-premade-quest.ts";
import { QUEST_START_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

const START_DETAILS = z.object({
  premadeId: PREMADE_QUEST_ID,
  name: z.string(),
  context: z.string().trim(),
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

export async function startQuestAction(
  _previous: StartQuestState,
  data: FormData,
): Promise<StartQuestState> {
  const user = await requireUser();
  const parsed = START_DETAILS.safeParse(Object.fromEntries(data));
  if (!parsed.success) {
    return { kind: "invalid", message: QUEST_START_COPY.invalid };
  }
  const { premadeId, name, context, motivation } = parsed.data;
  const checked = checkQuestName(name);
  if (checked.kind !== "named") {
    let message: string = QUESTS_COPY.needsName;
    if (checked.kind === "tooLong") {
      message = QUESTS_COPY.nameTooLong(QUEST_NAME_MAX_LENGTH);
    }
    return { kind: "invalid", message };
  }
  const result = await startPremadeQuest(user.id, {
    premadeId,
    name: checked.name,
    context,
    motivation,
  });
  redirect(`/quests/${result.quest.id}`);
}

export type { StartQuestState };
