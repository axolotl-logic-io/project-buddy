"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { startQuest } from "@/conversations/start-quest.ts";
import { PREMADE_QUESTS } from "@/quests/premade-quests.ts";
import { checkQuestName, QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { QUEST_START_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

const START_DETAILS = z.object({
  premadeId: z.enum(["dailies", "learn", "make", "do"]),
  name: z.string(),
  context: z.string().trim(),
  motivation: z.string().trim().default(""),
});

// What came of starting: nothing yet, or why nothing started. A start
// that succeeds opens the quest instead.
type StartQuestState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "invalid" | "claudeUnavailable";
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
  const premade = PREMADE_QUESTS.find(({ id }) => id === premadeId);
  if (premade === undefined) {
    return { kind: "invalid", message: QUEST_START_COPY.invalid };
  }
  const construct = getConstruct(premade.constructId);
  const details = {
    name: checked.name,
    context,
    motivation,
    construct,
  };
  let result: Awaited<ReturnType<typeof startDailies>>;
  if (premadeId === "dailies") {
    result = await startDailies(user.id, details);
  } else {
    result = await startQuest(user.id, checked.name, construct, {
      context,
      motivation,
    });
  }
  if (result.kind === "claudeUnavailable") {
    return { kind: result.kind, message: OPENING_COPY.claudeUnavailable };
  }
  redirect(`/quests/${result.chat.quest.id}`);
}

export type { StartQuestState };
