"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { QUEST_ID } from "@/ids.ts";
import { getQuest } from "@/quests/store.ts";
import { changeQuestSpell } from "@/spells/quest-spell.ts";
import { SPELL_REFERENCE } from "@/spells/spell-definition.ts";
import { SPELL_MODE_COPY } from "@/ui/copy/spells.ts";

const SPELL_REQUEST = z.object({
  questId: QUEST_ID,
  spell: SPELL_REFERENCE.optional(),
});

async function changeQuestSpellAction(
  request: unknown,
): Promise<QuestActionResult> {
  const user = await requireUser();
  const change = SPELL_REQUEST.safeParse(request).data;
  const quest = await getQuest(user.id, change?.questId ?? "");
  if (
    change === undefined ||
    quest === undefined ||
    !(await changeQuestSpell(user.id, quest, change.spell))
  ) {
    return { kind: "problem", text: SPELL_MODE_COPY.unavailable };
  }
  refresh();
  return { kind: "saved" };
}

export { changeQuestSpellAction };
