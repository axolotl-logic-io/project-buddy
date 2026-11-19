// Quests, stored in Postgres. A quest is open to its owner and its
// accepted members (src/accounts/owner-scope.ts): every function takes the
// acting user first and reads only quests open to them. An id from outside the code, such as a
// route parameter, is looked up as a string; anything malformed, unknown or
// another user's is not found.

import { and, desc, eq } from "drizzle-orm";
import { questOpenTo } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import type { QuestSharing } from "@/quests/membership.ts";
import type { QuestName } from "@/quests/quest-name.ts";
import {
  SHARING_COLUMNS,
  type SharingRow,
  sharingOf,
} from "@/quests/quest-sharing.ts";
import { QUEST_STATUS, type QuestStatus } from "@/quests/quest-status.ts";

interface Quest {
  id: QuestId;
  name: string;
  createdAt: Date;
  status: QuestStatus;
  statusRevision: number;
  startingContext?: string | undefined;
  // Whether it is the user's Dailies quest (src/conversations/dailies.ts).
  dailies: boolean;
  // How it is shared, as the user reading it sees it.
  sharing: QuestSharing;
}

interface QuestRow {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly status: string;
  readonly statusRevision: number;
  readonly dailies: boolean;
  readonly startingContext: string | null;
}

// The columns a quest is read from. Select only the fields this store
// uses, so a later release can drop retired columns while this build is
// still live.
const QUEST_COLUMNS: {
  readonly startingContext: typeof quests.startingContext;
  readonly status: typeof quests.status;
  readonly statusRevision: typeof quests.statusRevision;
  readonly id: typeof quests.id;
  readonly name: typeof quests.name;
  readonly createdAt: typeof quests.createdAt;
  readonly dailies: typeof quests.dailies;
} = {
  startingContext: quests.startingContext,
  status: quests.status,
  statusRevision: quests.statusRevision,
  id: quests.id,
  name: quests.name,
  createdAt: quests.createdAt,
  dailies: quests.dailies,
};

// Rows as quests, as viewer reads them. A row whose id is not a UUID is
// skipped, though the uuid column never holds one.
function toQuests(
  viewer: UserId,
  rows: readonly (QuestRow & SharingRow)[],
): Quest[] {
  return rows.flatMap((row) => {
    const questId = parseQuestId(row.id);
    if (questId === undefined) {
      return [];
    }
    return [
      {
        id: questId,
        name: row.name,
        startingContext: row.startingContext ?? undefined,
        createdAt: row.createdAt,
        status: QUEST_STATUS.parse(row.status),
        statusRevision: row.statusRevision,
        dailies: row.dailies,
        sharing: sharingOf(viewer, row),
      },
    ];
  });
}

export type { Quest };

// The quests open to the user, their own and those they are a member of,
// newest first.
export function listQuests(user: UserId): Promise<Quest[]> {
  return withAppErrors("listQuests", async () =>
    toQuests(
      user,
      await getDb()
        .select({ ...QUEST_COLUMNS, ...SHARING_COLUMNS })
        .from(quests)
        .where(questOpenTo(user))
        .orderBy(desc(quests.createdAt)),
    ),
  );
}

// The quest with this id, or undefined if the id is malformed, unknown or
// not open to the user.
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
      user,
      await getDb()
        .select({ ...QUEST_COLUMNS, ...SHARING_COLUMNS })
        .from(quests)
        .where(and(eq(quests.id, questId), questOpenTo(user))),
    ),
  );
  return quest;
}

// A new quest of the owner's, with no conversation. The site starts every
// quest with its conversation (src/conversations/start-quest.ts); tests make
// empty ones.
export function createQuest(owner: UserId, name: QuestName): Promise<Quest> {
  return withAppErrors("createQuest", async () => {
    const inserted = await getDb()
      .insert(quests)
      .values({ userId: owner, name })
      .returning({
        startingContext: quests.startingContext,
        status: quests.status,
        statusRevision: quests.statusRevision,
        id: quests.id,
        name: quests.name,
        createdAt: quests.createdAt,
        dailies: quests.dailies,
      });
    // A new quest is its owner's own, with no members yet.
    const [quest] = toQuests(
      owner,
      inserted.map((row) => ({
        ...row,
        ownerId: owner,
        ownerName: null,
        hasMembers: false,
      })),
    );
    if (quest === undefined) {
      throw new Error("Inserting a quest returned no quest");
    }
    return quest;
  });
}

// The owner or a member can rename a quest. Unknown or inaccessible ids
// change nothing.
export function renameQuest(
  owner: UserId,
  id: QuestId,
  name: QuestName,
): Promise<boolean> {
  return withAppErrors("renameQuest", async () => {
    const changed = await getDb()
      .update(quests)
      .set({ name })
      .where(and(eq(quests.id, id), questOpenTo(owner)))
      .returning({ id: quests.id });
    return changed.length > 0;
  });
}
