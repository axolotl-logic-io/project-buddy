// Quests, stored in Postgres. A quest is its owner's alone
// (src/accounts/owner-scope.ts): every function takes the acting user first
// and reads only their own quests. An id from outside the code, such as a
// route parameter, is looked up as a string; anything malformed, unknown or
// another user's is not found.

import { and, desc, eq } from "drizzle-orm";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import type { QuestName } from "@/quests/quest-name.ts";
import { QUEST_STATUS, type QuestStatus } from "@/quests/quest-status.ts";

interface Quest {
  id: QuestId;
  name: string;
  createdAt: Date;
  status: QuestStatus;
  statusRevision: number;
  // Whether it is the user's Dailies quest (src/conversations/dailies.ts).
  dailies: boolean;
}

interface QuestRow {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly status: string;
  readonly statusRevision: number;
  readonly dailies: boolean;
}

// The columns a quest is read from. Select only the fields this store
// uses, so a later release can drop retired columns while this build is
// still live.
const QUEST_COLUMNS: {
  readonly status: typeof quests.status;
  readonly statusRevision: typeof quests.statusRevision;
  readonly id: typeof quests.id;
  readonly name: typeof quests.name;
  readonly createdAt: typeof quests.createdAt;
  readonly dailies: typeof quests.dailies;
} = {
  status: quests.status,
  statusRevision: quests.statusRevision,
  id: quests.id,
  name: quests.name,
  createdAt: quests.createdAt,
  dailies: quests.dailies,
};

// Rows as quests. A row whose id is not a UUID is skipped, though the uuid
// column never holds one.
function toQuests(rows: readonly QuestRow[]): Quest[] {
  return rows.flatMap(
    ({ id, name, createdAt, status, statusRevision, dailies }) => {
      const questId = parseQuestId(id);
      if (questId === undefined) {
        return [];
      }
      return [
        {
          id: questId,
          name,
          createdAt,
          status: QUEST_STATUS.parse(status),
          statusRevision,
          dailies,
        },
      ];
    },
  );
}

export type { Quest };

// The user's quests, newest first.
export function listQuests(user: UserId): Promise<Quest[]> {
  return withAppErrors("listQuests", async () =>
    toQuests(
      await getDb()
        .select(QUEST_COLUMNS)
        .from(quests)
        .where(questOwnedBy(user))
        .orderBy(desc(quests.createdAt)),
    ),
  );
}

// The user's quest with this id, or undefined if the id is malformed,
// unknown or another user's.
export async function getQuest(
  user: UserId,
  id: string,
): Promise<Quest | undefined> {
  const questId = parseQuestId(id);
  if (questId === undefined) {
    return undefined;
  }
  const [quest] = await withAppErrors("getQuest", async () =>
    toQuests(
      await getDb()
        .select(QUEST_COLUMNS)
        .from(quests)
        .where(and(eq(quests.id, questId), questOwnedBy(user))),
    ),
  );
  return quest;
}

// A new quest of the owner's, with no conversation. The site starts every
// quest with its conversation (src/conversations/start-quest.ts); tests make
// empty ones.
export function createQuest(owner: UserId, name: QuestName): Promise<Quest> {
  return withAppErrors("createQuest", async () => {
    const [quest] = toQuests(
      await getDb().insert(quests).values({ userId: owner, name }).returning({
        status: quests.status,
        statusRevision: quests.statusRevision,
        id: quests.id,
        name: quests.name,
        createdAt: quests.createdAt,
        dailies: quests.dailies,
      }),
    );
    if (quest === undefined) {
      throw new Error("Inserting a quest returned no quest");
    }
    return quest;
  });
}

// Only the owner can rename a quest. Unknown or inaccessible ids change nothing.
export function renameQuest(
  owner: UserId,
  id: QuestId,
  name: QuestName,
): Promise<boolean> {
  return withAppErrors("renameQuest", async () => {
    const changed = await getDb()
      .update(quests)
      .set({ name })
      .where(and(eq(quests.id, id), questOwnedBy(owner)))
      .returning({ id: quests.id });
    return changed.length > 0;
  });
}
