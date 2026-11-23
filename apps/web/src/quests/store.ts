// Quests, stored in Postgres. A quest is open to its owner and its
// accepted members (src/accounts/owner-scope.ts): every function takes the
// acting user first and reads only quests open to them. An id from outside the code, such as a
// route parameter, is looked up as a string; anything malformed, unknown or
// another user's is not found.

import { and, desc, eq, sql } from "drizzle-orm";
import { questOpenTo, questOwnedBy } from "@/accounts/owner-scope.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  isConstructId,
} from "@/constructs/index.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { quests } from "@/db/tables/quests.ts";
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
import { seedSpaces } from "@/spaces/space-store.ts";

interface Quest {
  id: QuestId;
  name: string;
  createdAt: Date;
  status: QuestStatus;
  statusRevision: number;
  startingContext?: string | undefined;
  // Whether it is the user’s Dailies quest.
  dailies: boolean;
  constructId: ConstructId;
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
  readonly constructId: string;
  readonly startingContext: string | null;
}

// The columns a quest is read from: only the fields this store uses.
const QUEST_COLUMNS: {
  readonly startingContext: typeof quests.startingContext;
  readonly status: typeof quests.status;
  readonly statusRevision: typeof quests.statusRevision;
  readonly id: typeof quests.id;
  readonly name: typeof quests.name;
  readonly createdAt: typeof quests.createdAt;
  readonly dailies: typeof quests.dailies;
  readonly constructId: typeof quests.constructId;
} = {
  startingContext: quests.startingContext,
  status: quests.status,
  statusRevision: quests.statusRevision,
  id: quests.id,
  name: quests.name,
  createdAt: quests.createdAt,
  dailies: quests.dailies,
  constructId: quests.constructId,
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
        dailies: row.dailies,
        constructId,
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
  readonly dailies?: boolean;
}

interface StartedQuest {
  readonly quest: Quest;
  readonly resumed: boolean;
}

function createOrResumeQuest(
  owner: UserId,
  name: QuestName,
  options: QuestStartOptions,
): Promise<StartedQuest> {
  return withAppErrors("createOrResumeQuest", () =>
    inTransaction(async (tx) => {
      const inserted = await tx
        .insert(quests)
        .values({ ...options, userId: owner, name })
        .onConflictDoNothing({ target: quests.userId, where: sql`dailies` })
        .returning(QUEST_COLUMNS);
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
        await seedSpaces(tx, quest.id);
        return { quest, resumed: false };
      }
      const [existing] = toQuests(
        owner,
        await tx
          .select({ ...QUEST_COLUMNS, ...SHARING_COLUMNS })
          .from(quests)
          .where(and(questOwnedBy(owner), eq(quests.dailies, true))),
      );
      if (existing === undefined) {
        throw new Error("The active Dailies quest could not be read");
      }
      return { quest: existing, resumed: true };
    }),
  );
}

async function createQuest(owner: UserId, name: QuestName): Promise<Quest> {
  const { quest } = await createOrResumeQuest(owner, name, {});
  return quest;
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

export type { Quest, StartedQuest };
export { createOrResumeQuest, createQuest, getQuest, listQuests, renameQuest };
