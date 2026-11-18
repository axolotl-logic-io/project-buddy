import { z } from "zod";
import {
  apiData,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { type SpellView, spellView } from "@/api/api-views.ts";
import { findConversation } from "@/conversations/conversation-store.ts";
import type { UserId } from "@/ids.ts";
import type { Quest } from "@/quests/store.ts";
import { changeQuestSpell } from "@/spells/quest-spell.ts";
import {
  SPELL_REFERENCE,
  type SpellReference,
} from "@/spells/spell-definition.ts";
import { readActiveSpell } from "@/spells/spell-store.ts";

const CAST_BODY = z.object({ spell: SPELL_REFERENCE });

const NO_SPELL = "No such spell is open to you.";

// Sets the spell of the quest's conversation, as the site's spellbook does,
// and answers with the conversation's spell after it; undefined stops it.
async function changeSpell(
  user: UserId,
  quest: Quest,
  spell: SpellReference | undefined,
): Promise<Response> {
  if (!(await changeQuestSpell(user, quest, spell))) {
    return apiProblem("not_found", NO_SPELL, "spell");
  }
  const conversation = await findConversation(user, quest.id);
  if (conversation === undefined) {
    return apiData({ conversationId: null, activeSpell: null });
  }
  const active = await readActiveSpell(user, conversation);
  let activeSpell: SpellView | null = null;
  if (active !== undefined) {
    activeSpell = spellView(active);
  }
  return apiData({ conversationId: conversation.id, activeSpell });
}

// Casts a spell in the quest's conversation, replacing any active one.
export const PUT = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, CAST_BODY);
    if (body instanceof Response) {
      return body;
    }
    return await changeSpell(user.id, quest, body.spell);
  },
);

// Stops the conversation's spell. Stopping when none is active changes
// nothing.
export const DELETE = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> =>
    await changeSpell(user.id, quest, undefined),
);
