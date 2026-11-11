// Reads what Home offers to continue (today.ts). A quest is as active as
// its conversation: its newest message, or when it started. Reading makes
// no model call: the next step is whatever the quest's plan or Journal
// records (nextStepOfQuest). It reads only the quests open to the user:
// their own, and the team quests they are a member of.
import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { unreadFor } from "@/chats/unread-marks.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseProjectId, type UserId } from "@/ids.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { nextStepOfQuest } from "@/memory/next-step.ts";
import { measureServerOperation } from "@/performance/server-spans.ts";
import { EMPTY_PLAN } from "@/plan/plan.ts";
import { readPlan } from "@/plan/plan-store.ts";
import type { TodayProject } from "@/today/today.ts";

// When a conversation was last active: its newest message's time, or when
// it started if it has none.
function lastActiveAt(): SQL<Date> {
  return sql`coalesce((select max(${messages.createdAt}) from ${messages} where ${messages.chatId} = ${chats.id}), ${chats.createdAt})`.mapWith(
    chats.createdAt,
  );
}

// The quest's next step, from its plan and Journal read together.
async function readNextStep(
  owner: UserId,
  projectId: ProjectId,
): Promise<string | undefined> {
  const [memory, plan] = await Promise.all([
    readMemory(owner, projectId),
    readPlan(owner, projectId),
  ]);
  return nextStepOfQuest(memory, plan ?? EMPTY_PLAN);
}

// The Active quest open to the owner whose conversation was most recently
// active, with its next step, or undefined if they have none; and whether
// this is their first visit: no quest and no Chat yet.
function readHomeSummary(owner: UserId): Promise<{
  latestQuest: TodayProject | undefined;
  firstVisit: boolean;
}> {
  return measureServerOperation("home-summary", () =>
    withAppErrors("readHomeSummary", async () => {
      const active = lastActiveAt();
      const [[latest], [conversation]] = await Promise.all([
        getDb()
          .select({
            id: projects.id,
            name: projects.name,
            unread: unreadFor(owner),
          })
          .from(chats)
          .innerJoin(projects, eq(chats.projectId, projects.id))
          .where(
            and(
              chatOpenTo(owner),
              eq(chats.continuing, true),
              eq(projects.status, "active"),
            ),
          )
          .orderBy(desc(active), desc(chats.id))
          .limit(1),
        getDb()
          .select({ id: chats.id })
          .from(chats)
          .where(and(chatOpenTo(owner), eq(chats.continuing, true)))
          .limit(1),
      ]);
      const id = parseProjectId(latest?.id ?? "");
      if (latest === undefined || id === undefined) {
        return {
          latestQuest: undefined,
          firstVisit: conversation === undefined,
        };
      }
      return {
        latestQuest: {
          project: { id, name: latest.name },
          nextStep: await readNextStep(owner, id),
          unread: latest.unread,
        },
        firstVisit: false,
      };
    }),
  );
}

export { readHomeSummary };
