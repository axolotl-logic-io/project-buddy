import { and, eq, sql } from "drizzle-orm";
import { questOpenTo } from "@/accounts/owner-scope.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { recordEvents, takeBackEvents } from "@/experience/experience-store.ts";
import type { QuestId, UserId } from "@/ids.ts";
import type { StatusChange } from "@/quests/quest-status.ts";

// Every status writer locks the quest, so a stale form or Undo cannot
// overwrite a later change, even when two requests arrive together.
async function lockedQuest(
  tx: Transaction,
  user: UserId,
  id: QuestId,
): Promise<
  { status: string; statusRevision: number; name: string } | undefined
> {
  const [quest] = await tx
    .select({
      status: quests.status,
      statusRevision: quests.statusRevision,
      name: quests.name,
    })
    .from(quests)
    .where(and(eq(quests.id, id), questOpenTo(user)))
    .for("update");
  return quest;
}
// Saves the change on the locked quest. Completing it gains the user a
// point, and reopening a completed quest takes that point back.
async function saveStatus(
  tx: Transaction,
  user: UserId,
  change: StatusChange,
): Promise<void> {
  await tx
    .update(quests)
    .set({
      status: change.toStatus,
      statusRevision: sql`${quests.statusRevision} + 1`,
    })
    .where(and(eq(quests.id, change.questId), questOpenTo(user)));
  if (change.toStatus === "completed") {
    await recordEvents(
      tx,
      { user, questId: change.questId },
      "completing-quests",
      [change.questId],
    );
  } else if (change.fromStatus === "completed") {
    await takeBackEvents(tx, "completing-quests", change.questId, [
      change.questId,
    ]);
  }
}

// A change the owner or a member asked for. The revision is the one shown
// in the UI, never a blind overwrite. Undefined includes stale, foreign and
// already-set.
function changeQuestStatus(
  user: UserId,
  change: StatusChange,
): Promise<StatusChange | undefined> {
  return withAppErrors("change quest status", () =>
    inTransaction(async (tx) => {
      const quest = await lockedQuest(tx, user, change.questId);
      if (
        quest === undefined ||
        quest.statusRevision !== change.revision ||
        quest.status !== change.fromStatus ||
        quest.status === change.toStatus
      ) {
        return;
      }
      await saveStatus(tx, user, change);
      return { ...change, revision: change.revision + 1 };
    }),
  );
}

export { changeQuestStatus };
