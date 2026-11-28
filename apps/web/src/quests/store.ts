// Quests, stored in Postgres. A quest is open to its owner and its
// accepted members (src/accounts/owner-scope.ts): every function takes the
// acting user first and reads only quests open to them. An id from outside the code, such as a
// route parameter, is looked up as a string; anything malformed, unknown or
// another user's is not found.

import { and, desc, eq, sql } from "drizzle-orm";
import { questOpenTo } from "@/accounts/owner-scope.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  isConstructId,
} from "@/constructs/index.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import { seedLists } from "@/lists/list-store.ts";
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
  constructId: ConstructId;
  // Whether it is its owner's Life, which stays Active.
  life: boolean;
  // How it is shared, as the user reading it sees it.
  sharing: QuestSharing;
}

interface QuestRow {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly status: string;
  readonly statusRevision: number;
  readonly constructId: string;
  readonly startingContext: string | null;
  readonly life: boolean;
}

// The columns a quest is read from: only the fields this store uses.
const QUEST_COLUMNS: {
  readonly startingContext: typeof quests.startingContext;
  readonly status: typeof quests.status;
  readonly statusRevision: typeof quests.statusRevision;
  readonly id: typeof quests.id;
  readonly name: typeof quests.name;
  readonly createdAt: typeof quests.createdAt;
  readonly constructId: typeof quests.constructId;
  readonly life: typeof quests.life;
} = {
  startingContext: quests.startingContext,
  status: quests.status,
  statusRevision: quests.statusRevision,
  id: quests.id,
  name: quests.name,
  createdAt: quests.createdAt,
  constructId: quests.constructId,
  life: quests.life,
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
    let constructId = DEFAULT_CONSTRUCT_ID;
    if (isConstructId(row.constructId)) {
      ({ constructId } = row);
    }
    return [
      {
        id: questId,
        name: row.name,
        startingContext: row.startingContext ?? undefined,
        createdAt: row.createdAt,
        status: QUEST_STATUS.parse(row.status),
        statusRevision: row.statusRevision,
        constructId,
        life: row.life,
        sharing: sharingOf(viewer, row),
      },
    ];
  });
}

// The quests open to the user, their own and those they are a member of,
// newest first.
function listQuests(user: UserId): Promise<Quest[]> {
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
async function getQuest(user: UserId, id: string): Promise<Quest | undefined> {
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

interface QuestStartOptions {
  readonly constructId?: ConstructId;
  readonly startingContext?: string;
}

// A new quest with its starting lists, under id when one is given. A
// quest that already has that id is left alone, and none is made.
function insertQuest(
  owner: UserId,
  name: QuestName,
  options: QuestStartOptions & { readonly id?: QuestId },
): Promise<Quest | undefined> {
  return withAppErrors("createQuest", () =>
    inTransaction(async (tx) => {
      const inserted = await tx
        .insert(quests)
        .values({ ...options, userId: owner, name })
        .onConflictDoNothing({ target: quests.id })
        .returning(QUEST_COLUMNS);
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
      if (quest !== undefined) {
        await seedLists(tx, quest.id);
      }
      return quest;
    }),
  );
}

// A new quest with its starting lists.
async function createQuest(
  owner: UserId,
  name: QuestName,
  options: QuestStartOptions = {},
): Promise<Quest> {
  const quest = await insertQuest(owner, name, options);
  if (quest === undefined) {
    throw new Error("Inserting a quest returned no quest");
  }
  return quest;
}

// A new quest the browser has named the id of, so it can show the quest
// before the server replies, with its starting lists. Undefined, making
// nothing, if a quest already has that id.
function startQuest(
  owner: UserId,
  id: QuestId,
  name: QuestName,
  options: QuestStartOptions = {},
): Promise<Quest | undefined> {
  return insertQuest(owner, name, { ...options, id });
}

// The name a new Life starts with.
const LIFE_NAME = "Life";

// Makes the owner's Life, with its starting lists, unless they have one.
// Two at once make one: the second insert finds the first's row.
function ensureLife(owner: UserId): Promise<void> {
  return withAppErrors("ensureLife", () =>
    inTransaction(async (tx) => {
      const [made] = await tx
        .insert(quests)
        .values({ userId: owner, name: LIFE_NAME, life: true })
        .onConflictDoNothing({
          target: quests.userId,
          where: sql`${quests.life}`,
        })
        .returning({ id: quests.id });
      const id = parseQuestId(made?.id ?? "");
      if (id !== undefined) {
        await seedLists(tx, id);
      }
    }),
  );
}

// The owner or a member can rename a quest. Unknown or inaccessible ids
// change nothing.
function renameQuest(
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

export type { Quest };
export {
  createQuest,
  ensureLife,
  getQuest,
  LIFE_NAME,
  listQuests,
  QUEST_COLUMNS,
  renameQuest,
  startQuest,
  toQuests,
};
