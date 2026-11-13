import { and, eq, isNotNull } from "drizzle-orm";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { type Database, getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { SPELL_ID, type SpellId } from "@/spells/spell.ts";

async function currentSpell(
  owner: UserId,
  chat: { readonly id: ChatId },
  db: Database = getDb(),
): Promise<SpellId | undefined> {
  const [row] = await withAppErrors("read spell", () =>
    db
      .select({ spell: chats.spell })
      .from(chats)
      .where(and(eq(chats.id, chat.id), chatOpenTo(owner))),
  );
  return SPELL_ID.optional().parse(row?.spell ?? undefined);
}

// Set one owned quest conversation's spell. Undefined stops it.
function setSpell(
  owner: UserId,
  request: { readonly chatId: ChatId; readonly spell: SpellId | undefined },
  db: Database = getDb(),
): Promise<boolean> {
  return withAppErrors("set spell", async () => {
    const rows = await db
      .update(chats)
      .set({ spell: request.spell ?? null })
      .where(
        and(
          eq(chats.id, request.chatId),
          chatOpenTo(owner),
          isNotNull(chats.questId),
        ),
      )
      .returning({ id: chats.id });
    return rows.length > 0;
  });
}

export { currentSpell, setSpell };
