import { and, eq } from "drizzle-orm";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { quests } from "@/db/tables/quests.ts";
import type { UserId } from "@/ids.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest, type Quest } from "@/quests/store.ts";

interface TestData {
  readonly quest: (name?: string, createdAt?: Date) => Promise<Quest>;
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

function testData(user: User): TestData {
  return {
    quest: (name = "Test quest", createdAt): Promise<Quest> => testQuest(user.id, name, createdAt),
  };
}

export type { TestData };
export { testData };
