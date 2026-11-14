import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
  chatOpenTo,
  ideaOpenTo,
  questOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getChat } from "@/chats/store.ts";
import { moveConversationAssets } from "@/constructs/visual-asset-store.ts";
import { inTransaction } from "@/db/client.ts";
import { questIdeas } from "@/db/tables/quest-ideas.ts";
import { chats, quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { CHAT_ID, type ChatId, type UserId } from "@/ids.ts";
import { reopenPlan } from "@/plan/plan-store.ts";

// Replaces private Chat or an active Dailies conversation with an empty one.
// The construct stays the same; quest lists and progress endure. Replacing the
// id also prevents a late reply or a browser draft from repopulating the reset.
async function resetConversation(
  owner: UserId,
  id: ChatId,
  options: { clearSteps: boolean; clearIdeas: boolean } = {
    clearSteps: false,
    clearIdeas: false,
  },
): Promise<ChatId | undefined> {
  const conversation = await getChat(owner, id);
  if (conversation === undefined) {
    return undefined;
  }
  return withAppErrors("reset conversation", () =>
    inTransaction(async (db) => {
      const dailies = db
        .select({ id: quests.id })
        .from(quests)
        .where(
          and(
            questOwnedBy(owner),
            eq(quests.dailies, true),
            eq(quests.status, "active"),
          ),
        );
      const [previous] = await db
        .select()
        .from(chats)
        .where(
          and(
            eq(chats.id, id),
            chatOpenTo(owner),
            eq(chats.continuing, true),
            or(isNull(chats.questId), inArray(chats.questId, dailies)),
          ),
        )
        .for("update");
      if (previous === undefined) {
        return;
      }
      if (conversation.quest !== undefined) {
        await reopenPlan(owner, conversation.quest.id, db, options.clearSteps);
        if (options.clearIdeas) {
          await db
            .delete(questIdeas)
            .where(
              and(
                eq(questIdeas.questId, conversation.quest.id),
                ideaOpenTo(owner),
              ),
            );
        }
      }
      const nextId = CHAT_ID.parse(crypto.randomUUID());
      await db.insert(chats).values({
        ...previous,
        id: nextId,
        spell: null,
        spellSnapshot: null,
        continuing: false,
        createdAt: new Date(),
      });
      await moveConversationAssets(owner, db, id, nextId);
      await db.delete(chats).where(and(eq(chats.id, id), chatOpenTo(owner)));
      await db
        .update(chats)
        .set({ continuing: true })
        .where(and(eq(chats.id, nextId), chatOpenTo(owner)));
      return nextId;
    }),
  );
}

export { resetConversation };
