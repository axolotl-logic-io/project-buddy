// Each project's milestones, its progress timeline, stored in Postgres. A
// milestone belongs to its project's user: every function takes the owner
// first, so another user's project has no milestones, another user's
// milestone reads as not found, and nothing is written to either. Callers
// pass text that MILESTONE_TEXT accepts.
import { and, desc, eq, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { z } from "zod";
import { milestoneOwnedBy, ownsProject } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { milestones } from "@/db/tables/milestones.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  CHAT_ID,
  type ChatId,
  MILESTONE_ID,
  type MilestoneId,
  type ProjectId,
  type UserId,
} from "@/ids.ts";
import type { Milestone } from "@/milestones/milestone.ts";

// Where a new milestone comes from: a chat in the project.
interface MilestoneSource {
  readonly projectId: ProjectId;
  readonly chatId: ChatId;
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

const MILESTONE_ROW = z.object({
  id: MILESTONE_ID,
  chatId: CHAT_ID,
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

// Records a milestone with text, dated now, in the owner's project, from
// one of its chats. Undefined, with nothing saved, unless the project is the
// owner's and the chat is in it.
async function recordMilestone(
  owner: UserId,
  { projectId, chatId }: MilestoneSource,
  text: string,
): Promise<Milestone | undefined> {
  const qb = new QueryBuilder();
  const [recorded] = await withAppErrors("recordMilestone", async () =>
    toMilestones(
      await getDb()
        .insert(milestones)
        .select(
          qb
            .select({
              id: sql`gen_random_uuid()`.as("id"),
              projectId: sql`${chats.projectId}`.as("project_id"),
              chatId: sql`${chats.id}`.as("chat_id"),
              text: sql`${text}::text`.as("text"),
              recordedAt: sql`now()`.as("recorded_at"),
            })
            .from(chats)
            .where(
              and(
                eq(chats.id, chatId),
                eq(chats.projectId, projectId),
                ownsProject(owner, projectId),
              ),
            ),
        )
        .returning(MILESTONE_COLUMNS),
    ),
  );
  return recorded;
}

// The owner's project's milestones, newest first: its progress timeline, or
// only its newest limit milestones when a limit is given.
function listMilestones(
  owner: UserId,
  projectId: ProjectId,
  limit?: number,
): Promise<Milestone[]> {
  return withAppErrors("listMilestones", async () => {
    const query = getDb()
      .select(MILESTONE_COLUMNS)
      .from(milestones)
      .where(and(eq(milestones.projectId, projectId), milestoneOwnedBy(owner)))
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
): Promise<boolean> {
  const edited = await withAppErrors("editMilestone", async () =>
    toMilestones(
      await getDb()
        .update(milestones)
        .set({ text })
        .where(and(eq(milestones.id, id), milestoneOwnedBy(owner)))
        .returning(MILESTONE_COLUMNS),
    ),
  );
  return edited.length > 0;
}

// Deletes the owner's milestone. Deleting one that is gone, or another
// user's, changes nothing.
async function deleteMilestone(owner: UserId, id: MilestoneId): Promise<void> {
  await withAppErrors("deleteMilestone", () =>
    getDb()
      .delete(milestones)
      .where(and(eq(milestones.id, id), milestoneOwnedBy(owner))),
  );
}

export type { MilestoneSource };
export { deleteMilestone, editMilestone, listMilestones, recordMilestone };
