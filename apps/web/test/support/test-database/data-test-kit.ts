import { and, eq } from "drizzle-orm";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { quests } from "@/db/tables/quests.ts";
import type { UserId } from "@/ids.ts";
import {
  type ListItem,
  readListItems,
  writeListContents,
} from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest, type Quest } from "@/quests/store.ts";
import type { Rite } from "@/rites/rite.ts";
import { saveRite } from "@/rites/rite-store.ts";

interface TestData {
  readonly quest: (name?: string, createdAt?: Date) => Promise<Quest>;
  // A one-off task at the end of the quest's Tasks list.
  readonly task: (quest: Quest, text: string) => Promise<ListItem>;
  // An own rite, active, with one reply.
  readonly rite: (name: string) => Promise<Rite>;
}

async function testQuest(
  owner: UserId,
  name: string,
  createdAt: Date | undefined,
): Promise<Quest> {
  const quest = await createQuest(owner, QUEST_NAME.parse(name));
  if (createdAt === undefined) {
    return quest;
  }
  await getDb()
    .update(quests)
    .set({ createdAt })
    .where(and(eq(quests.id, quest.id), questOwnedBy(owner)));
  return { ...quest, createdAt };
}

async function testTask(
  owner: UserId,
  quest: Quest,
  text: string,
): Promise<ListItem> {
  const [tasks] = await readLists(owner, quest.id);
  if (tasks === undefined) {
    throw new Error("The quest has no Tasks list");
  }
  await writeListContents(owner, quest.id, tasks.id, { kind: "add", text });
  const task = (await readListItems(owner, quest.id, tasks.id)).at(-1);
  if (task === undefined) {
    throw new Error("The task was not saved");
  }
  return task;
}

async function testRite(owner: UserId, name: string): Promise<Rite> {
  const rite = await saveRite(owner, {
    name,
    firstMessage: "What is on your mind?",
    replies: ["Noted."],
    order: "random",
    loop: true,
    finalReply: "",
  });
  if (rite === undefined) {
    throw new Error("The rite was not saved");
  }
  return rite;
}

function testData(user: User): TestData {
  return {
    quest: (name?: string, createdAt?: Date): Promise<Quest> =>
      testQuest(user.id, name ?? "Test quest", createdAt),
    task: (quest: Quest, text: string): Promise<ListItem> =>
      testTask(user.id, quest, text),
    rite: (name: string): Promise<Rite> => testRite(user.id, name),
  };
}

export type { TestData };
export { testData };
