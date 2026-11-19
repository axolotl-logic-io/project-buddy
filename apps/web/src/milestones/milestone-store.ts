// Each quest's milestones, its progress timeline, stored in Postgres. A
// milestone is open to its quest's owner and members: every function takes
// the acting user first, so a quest not open to them has no milestones,
// its milestones read as not found, and nothing is written to either. Callers
// pass text that MILESTONE_TEXT accepts.

import { and, desc, eq, exists, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { z } from "zod";
import { milestoneOpenTo, opensQuest } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { milestones } from "@/db/tables/milestones.ts";
import { chats, quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  CHAT_ID,
  type ChatId,
  MILESTONE_ID,
  type MilestoneId,
  type QuestId,
  type UserId,
} from "@/ids.ts";
import type { Milestone } from "@/milestones/milestone.ts";

// A new milestone belongs to a quest and can come from one of its chats.
interface MilestoneSource {
  readonly questId: QuestId;
  readonly chatId?: ChatId;
}

const MILESTONE_COLUMNS: Pick<
  typeof milestones,
  "id" | "chatId" | "text" | "recordedAt"
> = {
  id: milestones.id,
  chatId: milestones.chatId,
  text: milestones.text,
  recordedAt: milestones.recordedAt,
};

// A milestone's conversation is null once it is gone, as after the removal
// of adventures; the milestone stays, with no conversation.
const MILESTONE_ROW = z.object({
  id: MILESTONE_ID,
  chatId: CHAT_ID.nullable().transform((id) => id ?? undefined),
  text: z.string(),
  recordedAt: z.date(),
});

// Rows as milestones. A row the uuid columns should have kept out is
// skipped.
function toMilestones(rows: readonly unknown[]): Milestone[] {
  return rows.flatMap((row) => {
    const parsed = MILESTONE_ROW.safeParse(row);
    if (parsed.success) {
      return [parsed.data];
    }
    return [];
  });
}

// Records a milestone in an accessible quest, with an optional source chat.
// A supplied chat must belong to that quest.
async function recordMilestone(
  owner: UserId,
  { questId, chatId }: MilestoneSource,
  text: string,
): Promise<Milestone | undefined> {
  const qb = new QueryBuilder();
  let source: SQL | undefined;
  if (chatId !== undefined) {
    source = exists(
      qb
        .select({ id: chats.id })
        .from(chats)
        .where(and(eq(chats.id, chatId), eq(chats.questId, quests.id))),
    );
  }
  const [recorded] = await withAppErrors("recordMilestone", async () =>
    toMilestones(
      await getDb()
        .insert(milestones)
        .select(
          qb
            .select({
              id: sql`gen_random_uuid()`.as("id"),
              questId: sql`${quests.id}`.as("quest_id"),
              chatId: sql`${chatId ?? null}::uuid`.as("chat_id"),
              text: sql`${text}::text`.as("text"),
              recordedAt: sql`now()`.as("recorded_at"),
            })
            .from(quests)
            .where(
              and(eq(quests.id, questId), opensQuest(owner, questId), source),
            ),
        )
        .returning(MILESTONE_COLUMNS),
    ),
  );
  return recorded;
}

// The owner's quest's milestones, newest first: its progress timeline, or
// only its newest limit milestones when a limit is given.
function listMilestones(
  owner: UserId,
  questId: QuestId,
  limit?: number,
): Promise<Milestone[]> {
  return withAppErrors("listMilestones", async () => {
    const query = getDb()
      .select(MILESTONE_COLUMNS)
      .from(milestones)
      .where(and(eq(milestones.questId, questId), milestoneOpenTo(owner)))
      .orderBy(desc(milestones.recordedAt), desc(milestones.id));
    if (limit === undefined) {
      return toMilestones(await query);
    }
    return toMilestones(await query.limit(limit));
  });
}

// Changes the text of the owner's milestone, keeping its date and chat.
// False, with nothing changed, if the milestone is gone or another
// user's.
async function editMilestone(
  owner: UserId,
  id: MilestoneId,
  text: string,
  questId?: QuestId,
): Promise<boolean> {
  const edited = await withAppErrors("editMilestone", async () =>
    toMilestones(
      await getDb()
        .update(milestones)
        .set({ text })
        .where(
          and(eq(milestones.id, id), milestoneOpenTo(owner), inQuest(questId)),
        )
        .returning(MILESTONE_COLUMNS),
    ),
  );
  return edited.length > 0;
}

// Deletes the owner's milestone. Deleting one that is gone, or another
// user's, changes nothing.
async function deleteMilestone(
  owner: UserId,
  id: MilestoneId,
  questId?: QuestId,
): Promise<void> {
  await withAppErrors("deleteMilestone", () =>
    getDb()
      .delete(milestones)
      .where(
        and(eq(milestones.id, id), milestoneOpenTo(owner), inQuest(questId)),
      ),
  );
}

function inQuest(
  questId: QuestId | undefined,
): ReturnType<typeof eq> | undefined {
  if (questId !== undefined) {
    return eq(milestones.questId, questId);
  }
  return undefined;
}

export { deleteMilestone, editMilestone, listMilestones, recordMilestone };
