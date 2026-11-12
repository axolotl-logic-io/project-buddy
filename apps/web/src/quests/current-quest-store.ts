// Reads the quest Quests offers to Continue: the owner's Active quest whose
// conversation was most recently active, with its next step. Reading makes
// no model call: the next step is whatever the quest's plan
// records (nextStepOfQuest).

import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { chatOpenTo, questOwnedBy } from "@/accounts/owner-scope.ts";
import type { ChatQuest } from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import { EMPTY_PLAN, nextPlanStep } from "@/plan/plan.ts";
import { readPlan } from "@/plan/plan-store.ts";

interface CurrentQuest {
  readonly quest: ChatQuest;
  // The next step its plan records, or undefined if none.
  readonly nextStep: string | undefined;
}

// When a conversation was last active: its newest message's time, or when
// it started if it has none.
function lastActiveAt(): SQL<Date> {
  return sql`coalesce((select max(${messages.createdAt}) from ${messages} where ${messages.chatId} = ${chats.id}), ${chats.createdAt})`.mapWith(
    chats.createdAt,
  );
}

// The quest's next step, from its plan.
async function readNextStep(
  owner: UserId,
  questId: QuestId,
): Promise<string | undefined> {
  const plan = await readPlan(owner, questId);
  return nextPlanStep(plan ?? EMPTY_PLAN)?.text;
}

// The owner's Active quest whose conversation was most recently active,
// with its next step, or undefined if they have no Active quest with a
// conversation.
function readCurrentQuest(owner: UserId): Promise<CurrentQuest | undefined> {
  return withAppErrors("readCurrentQuest", async () => {
    const [latest] = await getDb()
      .select({ id: quests.id, name: quests.name })
      .from(chats)
      .innerJoin(quests, eq(chats.questId, quests.id))
      .where(
        and(
          questOwnedBy(owner),
          chatOpenTo(owner),
          eq(chats.continuing, true),
          eq(quests.status, "active"),
        ),
      )
      .orderBy(desc(lastActiveAt()), desc(chats.id))
      .limit(1);
    const id = parseQuestId(latest?.id ?? "");
    if (latest === undefined || id === undefined) {
      return;
    }
    return {
      quest: { id, name: latest.name },
      nextStep: await readNextStep(owner, id),
    };
  });
}

export type { CurrentQuest };
export { readCurrentQuest };
