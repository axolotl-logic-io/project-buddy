// Reads the quest Quests offers to Continue: the owner's Active quest whose
// conversation was most recently active, with its next task. Reading makes
// no model call: the next task is whatever the quest's tasks
// records (nextStepOfQuest).

import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { chatOpenTo, questOpenTo } from "@/accounts/owner-scope.ts";
import type { ChatQuest } from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import type { QuestSharing } from "@/quests/membership.ts";
import { SHARING_COLUMNS, sharingOf } from "@/quests/quest-sharing.ts";
import { EMPTY_TASKS, nextTask } from "@/tasks/tasks.ts";
import { readTasks } from "@/tasks/tasks-store.ts";

interface CurrentQuest {
  readonly quest: ChatQuest;
  // How it is shared, as its reader sees it.
  readonly sharing: QuestSharing;
  // The next task its tasks records, or undefined if none.
  readonly nextTask: string | undefined;
}

// When a conversation was last active: its newest message's time, or when
// it started if it has none.
function lastActiveAt(): SQL<Date> {
  return sql`coalesce((select max(${messages.createdAt}) from ${messages} where ${messages.chatId} = ${chats.id}), ${chats.createdAt})`.mapWith(
    chats.createdAt,
  );
}

// The quest's next task, from its tasks.
async function readNextTask(
  owner: UserId,
  questId: QuestId,
): Promise<string | undefined> {
  const tasks = await readTasks(owner, questId);
  return nextTask(tasks ?? EMPTY_TASKS)?.text;
}

// The owner's Active quest whose conversation was most recently active,
// with its next task, or undefined if they have no Active quest with a
// conversation.
function readCurrentQuest(owner: UserId): Promise<CurrentQuest | undefined> {
  return withAppErrors("readCurrentQuest", async () => {
    const [latest] = await getDb()
      .select({ id: quests.id, name: quests.name, ...SHARING_COLUMNS })
      .from(chats)
      .innerJoin(quests, eq(chats.questId, quests.id))
      .where(
        and(
          questOpenTo(owner),
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
      sharing: sharingOf(owner, latest),
      nextTask: await readNextTask(owner, id),
    };
  });
}

export type { CurrentQuest };
export { readCurrentQuest };
