// Reads the quest Quests offers to Continue: the owner's Active quest whose
// conversation was most recently active, with its next step. Reading makes
// no model call: the next step is whatever the quest's plan or Journal
// records (nextStepOfQuest).
import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { chatOpenTo, projectOwnedBy } from "@/accounts/owner-scope.ts";
import type { ChatProject } from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseProjectId, type UserId } from "@/ids.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { nextStepOfQuest } from "@/memory/next-step.ts";
import { EMPTY_PLAN } from "@/plan/plan.ts";
import { readPlan } from "@/plan/plan-store.ts";

interface CurrentQuest {
  readonly project: ChatProject;
  // The next step its plan or Journal records, or undefined if none.
  readonly nextStep: string | undefined;
}

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

// The owner's Active quest whose conversation was most recently active,
// with its next step, or undefined if they have no Active quest with a
// conversation.
function readCurrentQuest(owner: UserId): Promise<CurrentQuest | undefined> {
  return withAppErrors("readCurrentQuest", async () => {
    const [latest] = await getDb()
      .select({ id: projects.id, name: projects.name })
      .from(chats)
      .innerJoin(projects, eq(chats.projectId, projects.id))
      .where(
        and(
          projectOwnedBy(owner),
          chatOpenTo(owner),
          eq(chats.continuing, true),
          eq(projects.status, "active"),
        ),
      )
      .orderBy(desc(lastActiveAt()), desc(chats.id))
      .limit(1);
    const id = parseProjectId(latest?.id ?? "");
    if (latest === undefined || id === undefined) {
      return;
    }
    return {
      project: { id, name: latest.name },
      nextStep: await readNextStep(owner, id),
    };
  });
}

export type { CurrentQuest };
export { readCurrentQuest };
