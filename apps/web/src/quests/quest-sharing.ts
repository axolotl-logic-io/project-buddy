// Reads how each quest is shared, alongside the quest, for whoever it is
// open to: whether it has members, and whose it is. Lists of quests, the
// quest to continue and the Quick Note choice show it, since a personal
// quest and a multi-user one often have the same name.

import { type SQL, sql } from "drizzle-orm";
import { questMembers } from "@/db/tables/quest-members.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import type { UserId } from "@/ids.ts";
import type { QuestSharing } from "@/quests/membership.ts";

interface SharingRow {
  readonly ownerId: string;
  readonly ownerName: string | null;
  readonly hasMembers: boolean;
}

// The columns sharingOf reads, selected with a quest's own.
const SHARING_COLUMNS: {
  readonly ownerId: typeof quests.userId;
  readonly ownerName: SQL<string | null>;
  readonly hasMembers: SQL<boolean>;
} = {
  ownerId: quests.userId,
  ownerName: sql<
    string | null
  >`(select coalesce(${users.name}, ${users.email}) from ${users} where ${users.id} = ${quests.userId})`,
  hasMembers: sql<boolean>`exists (select 1 from ${questMembers} where ${questMembers.questId} = ${quests.id})`,
};

// How the quest a row was read with is shared, as viewer sees it.
function sharingOf(viewer: UserId, row: SharingRow): QuestSharing {
  if (row.ownerId !== viewer) {
    return { kind: "joined", owner: row.ownerName ?? "" };
  }
  if (row.hasMembers) {
    return { kind: "shared" };
  }
  return { kind: "personal" };
}

export type { SharingRow };
export { SHARING_COLUMNS, sharingOf };
