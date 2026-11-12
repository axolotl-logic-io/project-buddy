import { and, desc, eq, exists, sql } from "drizzle-orm";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import { questStatusApprovals } from "@/db/tables/quest-status-approvals.ts";
import { chats, quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import {
  type QuestStatus,
  STATUS_APPROVAL,
  STATUS_APPROVAL_ID,
  type StatusApproval,
  type StatusApprovalId,
  type StatusChange,
} from "@/quests/quest-status.ts";

// Every status writer locks the quest, so a stale card or Undo cannot
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
    .where(and(eq(quests.id, id), questOwnedBy(user)))
    .for("update");
  return quest;
}
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
    .where(and(eq(quests.id, change.questId), questOwnedBy(user)));
}

// An owner-requested change. The revision is the one shown in the UI, never
// a blind overwrite. Undefined includes stale, foreign and already-set.
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

// The tool creates only a proposal for its own quest adventure. It cannot
// approve one or change status.
function requestQuestStatus(
  user: UserId,
  chatId: ChatId,
  questId: QuestId,
  toStatus: QuestStatus,
): Promise<StatusApproval | undefined> {
  return withAppErrors("request quest status", () =>
    inTransaction(async (tx) => {
      const quest = await lockedQuest(tx, user, questId);
      if (quest === undefined || quest.status === toStatus) {
        return;
      }
      const [chat] = await tx
        .select({ id: chats.id })
        .from(chats)
        .innerJoin(quests, eq(chats.questId, quests.id))
        .where(
          and(eq(chats.id, chatId), eq(quests.id, questId), questOwnedBy(user)),
        );
      if (chat === undefined) {
        return;
      }
      const [row] = await tx
        .insert(questStatusApprovals)
        .values({
          questId,
          chatId,
          userId: user,
          fromStatus: quest.status,
          toStatus,
          revision: quest.statusRevision,
        })
        .returning();
      return STATUS_APPROVAL.parse({ ...row, name: quest.name });
    }),
  );
}

// Refreshing a saved tool card reads the real decision, rather than trusting
// the original tool output. A changed quest invalidates a pending request.
async function readStatusApproval(
  user: UserId,
  id: StatusApprovalId,
): Promise<StatusApproval | undefined> {
  const [row] = await withAppErrors("read status approval", () =>
    getDb()
      .select({
        approval: questStatusApprovals,
        name: quests.name,
        revision: quests.statusRevision,
      })
      .from(questStatusApprovals)
      .innerJoin(quests, eq(questStatusApprovals.questId, quests.id))
      .where(
        and(
          eq(questStatusApprovals.id, id),
          eq(questStatusApprovals.userId, user),
          questOwnedBy(user),
        ),
      ),
  );
  if (row === undefined) {
    return undefined;
  }
  let { decision } = row.approval;
  if (decision === "pending" && row.revision !== row.approval.revision) {
    decision = "outdated";
  }
  return STATUS_APPROVAL.parse({ ...row.approval, name: row.name, decision });
}

// The requesting owner's latest card in this adventure, with its live decision.
// Other users cannot read proposal context through this path.
async function readLatestStatusApproval(
  user: UserId,
  chatId: ChatId,
): Promise<StatusApproval | undefined> {
  const [row] = await withAppErrors("read latest status approval", () =>
    getDb()
      .select({ id: questStatusApprovals.id })
      .from(questStatusApprovals)
      .innerJoin(quests, eq(questStatusApprovals.questId, quests.id))
      .where(
        and(
          questOwnedBy(user),
          eq(questStatusApprovals.userId, user),
          eq(questStatusApprovals.chatId, chatId),
        ),
      )
      .orderBy(
        desc(questStatusApprovals.createdAt),
        desc(questStatusApprovals.id),
      )
      .limit(1),
  );
  if (row === undefined) {
    return undefined;
  }
  return readStatusApproval(user, STATUS_APPROVAL_ID.parse(row.id));
}

// Approval is a separate authenticated user action, with no model-supplied
// status or consent flag. It consumes the exact saved proposal once.
function answerStatusApproval(
  user: UserId,
  id: StatusApprovalId,
  approve: boolean,
): Promise<StatusChange | undefined> {
  return withAppErrors("answer status approval", () =>
    inTransaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(questStatusApprovals)
        .innerJoin(quests, eq(questStatusApprovals.questId, quests.id))
        .where(
          and(
            eq(questStatusApprovals.id, id),
            eq(questStatusApprovals.userId, user),
            questOwnedBy(user),
          ),
        );
      if (request === undefined) {
        return;
      }
      const approval = STATUS_APPROVAL.parse({
        ...request.quest_status_approvals,
        name: request.quests.name,
      });
      const quest = await lockedQuest(tx, user, approval.questId);
      if (
        quest === undefined ||
        quest.statusRevision !== approval.revision ||
        quest.status !== approval.fromStatus
      ) {
        return;
      }
      let decision = "declined";
      if (approve) {
        decision = "approved";
      }
      const consumed = await tx
        .update(questStatusApprovals)
        .set({ decision })
        .where(
          and(
            eq(questStatusApprovals.id, id),
            eq(questStatusApprovals.userId, user),
            eq(questStatusApprovals.decision, "pending"),
            exists(
              tx
                .select({ id: quests.id })
                .from(quests)
                .where(
                  and(
                    eq(quests.id, questStatusApprovals.questId),
                    questOwnedBy(user),
                  ),
                ),
            ),
          ),
        )
        .returning({ id: questStatusApprovals.id });
      if (consumed.length === 0 || !approve) {
        return;
      }
      await saveStatus(tx, user, approval);
      return {
        questId: approval.questId,
        fromStatus: approval.fromStatus,
        toStatus: approval.toStatus,
        revision: approval.revision + 1,
      };
    }),
  );
}

export {
  answerStatusApproval,
  changeQuestStatus,
  readLatestStatusApproval,
  readStatusApproval,
  requestQuestStatus,
};
