import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import {
  findConversation,
  findOrCreateConversation,
} from "@/conversations/conversation-store.ts";
import type { UserId } from "@/ids.ts";
import type { Quest } from "@/quests/store.ts";
import { findSpell } from "@/spells/own-spell-store.ts";
import type { SpellReference } from "@/spells/spell-definition.ts";
import { setSpell } from "@/spells/spell-store.ts";

async function changeQuestSpell(
  user: UserId,
  quest: Pick<Quest, "id" | "name">,
  spell: SpellReference | undefined,
): Promise<boolean> {
  const conversation = await findConversation(user, quest.id);
  if (conversation !== undefined) {
    return await setSpell(user, { chatId: conversation.id, spell });
  }
  if (spell === undefined) {
    return true;
  }
  if ((await findSpell(user, spell)) === undefined) {
    return false;
  }
  const found = await findOrCreateConversation(user, quest, {
    construct: getConstruct(DEFAULT_CONSTRUCT_ID),
  });
  if (found === undefined) {
    return false;
  }
  return await setSpell(user, { chatId: found.conversation.id, spell });
}

export { changeQuestSpell };
