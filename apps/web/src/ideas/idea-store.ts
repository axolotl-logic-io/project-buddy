import { and, asc, eq, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { ideaOpenTo, questOwnedBy } from "@/accounts/owner-scope.ts";
import { type Database, getDb, inTransaction } from "@/db/client.ts";
import { questIdeas } from "@/db/tables/quest-ideas.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  IDEA,
  type Idea,
  type IdeaRequest,
  type IdeaResult,
} from "@/ideas/idea.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { changePlan } from "@/plan/plan-store.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";

const NOT_FOUND: IdeaResult = { kind: "problem", text: IDEAS_COPY.notFound };

// Only the quest's owner can read its ideas, in the order they were added.
function listIdeas(owner: UserId, questId: QuestId): Promise<Idea[]> {
  return withAppErrors("listIdeas", async () => {
    const rows = await getDb()
      .select({ id: questIdeas.id, text: questIdeas.text })
      .from(questIdeas)
      .where(and(eq(questIdeas.questId, questId), ideaOpenTo(owner)))
      .orderBy(asc(questIdeas.createdAt), asc(questIdeas.id));
    return rows.map((row) => IDEA.parse(row));
  });
}

// Every write checks ownership in SQL. Moving locks the idea until both the
// Plan change and removal commit, so concurrent moves cannot duplicate a step.
function changeIdea(
  owner: UserId,
  request: IdeaRequest,
  database: Database = getDb(),
): Promise<IdeaResult> {
  return withAppErrors("changeIdea", async () => {
    const { questId } = request;
    if (request.op === "add") {
      const rows = await database
        .insert(questIdeas)
        .select(
          new QueryBuilder()
            .select({
              id: sql`gen_random_uuid()`.as("id"),
              questId: sql`${questId}::uuid`.as("quest_id"),
              text: sql`${request.text}::text`.as("text"),
              createdAt: sql`now()`.as("created_at"),
            })
            .from(quests)
            .where(and(eq(quests.id, questId), questOwnedBy(owner))),
        )
        .returning({ id: questIdeas.id });
      if (rows.length === 0) {
        return NOT_FOUND;
      }
      return { kind: "saved" };
    }
    const scope = and(
      eq(questIdeas.questId, questId),
      eq(questIdeas.id, request.id),
      ideaOpenTo(owner),
    );
    if (request.op === "move") {
      return inTransaction(async (tx): Promise<IdeaResult> => {
        const [row] = await tx
          .select({ id: questIdeas.id, text: questIdeas.text })
          .from(questIdeas)
          .where(scope)
          .for("update");
        if (row === undefined) {
          return NOT_FOUND;
        }
        const idea = IDEA.parse(row);
        const changed = await changePlan(
          owner,
          { questId, author: "person" },
          [{ op: "add", text: idea.text }],
          tx,
        );
        if (changed?.kind !== "changed") {
          return { kind: "problem", text: IDEAS_COPY.planFull };
        }
        await tx.delete(questIdeas).where(scope);
        return { kind: "saved" };
      });
    }
    let rows: { id: string }[];
    if (request.op === "edit") {
      rows = await getDb()
        .update(questIdeas)
        .set({ text: request.text })
        .where(scope)
        .returning({ id: questIdeas.id });
    } else {
      rows = await getDb()
        .delete(questIdeas)
        .where(scope)
        .returning({ id: questIdeas.id });
    }
    if (rows.length === 0) {
      return NOT_FOUND;
    }
    return { kind: "saved" };
  });
}

export { changeIdea, listIdeas };
