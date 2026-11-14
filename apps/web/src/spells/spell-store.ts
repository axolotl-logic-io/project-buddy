import { and, eq, isNotNull } from "drizzle-orm";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { type Database, getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { findSpell } from "@/spells/own-spell-store.ts";
import { getSpell, SPELL_ID } from "@/spells/spell.ts";
import {
  SPELL_SNAPSHOT,
  type SpellReference,
  type SpellSnapshot,
} from "@/spells/spell-definition.ts";

async function readActiveSpell(
  owner: UserId,
  chat: { readonly id: ChatId },
  db: Database = getDb(),
): Promise<SpellSnapshot | undefined> {
  const [row] = await withAppErrors("read spell", () =>
    db
      .select({ spell: chats.spell, snapshot: chats.spellSnapshot })
      .from(chats)
      .where(and(eq(chats.id, chat.id), chatOpenTo(owner))),
  );
  if (row?.spell === null || row === undefined) {
    return undefined;
  }
  const snapshot = SPELL_SNAPSHOT.safeParse(row.snapshot);
  if (snapshot.success) {
    return snapshot.data;
  }
  const builtin = SPELL_ID.safeParse(row.spell);
  if (builtin.success) {
    return getSpell(builtin.data);
  }
  return undefined;
}

async function currentSpell(
  owner: UserId,
  chat: { readonly id: ChatId },
  db: Database = getDb(),
): Promise<SpellReference | undefined> {
  return (await readActiveSpell(owner, chat, db))?.id;
}

// Set one owned quest conversation's spell. Undefined stops it.
async function setSpell(
  owner: UserId,
  request: {
    readonly chatId: ChatId;
    readonly spell: SpellReference | undefined;
  },
  db: Database = getDb(),
): Promise<boolean> {
  let snapshot: SpellSnapshot | undefined;
  if (request.spell !== undefined) {
    snapshot = await findSpell(owner, request.spell);
    if (snapshot === undefined) {
      return false;
    }
  }
  return withAppErrors("set spell", async () => {
    const rows = await db
      .update(chats)
      .set({
        spell: snapshot?.definition.destination ?? null,
        spellSnapshot: snapshot ?? null,
      })
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

export { currentSpell, readActiveSpell, setSpell };
