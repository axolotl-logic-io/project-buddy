import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { quests } from "./quests-and-chats.ts";
import { users } from "./users.ts";

// A quest's accepted members: users other than its owner who accepted an
// invitation to it. Membership opens the quest to them
// (src/accounts/owner-scope.ts). Removing a member deletes the row and
// leaves what they wrote in the quest. A row goes with its quest or its
// user.
const questMembers = pgTable(
  "quest_members",
  {
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("quest_members_quest_user_idx").on(table.questId, table.userId),
    index("quest_members_user_id_idx").on(table.userId),
  ],
);

// Pending quest invitations: one per quest and invitee, until the invitee
// accepts or declines it, or someone the quest is open to withdraws it.
// Accepting deletes the row and adds a quest_members row, so a pending
// invitation never opens the quest. The emailed acceptance link holds a
// token whose SHA-256 is token_hash; it works until link_expires_at. A
// fresh invitation replaces the token, and signing out everywhere clears
// it, leaving the invitation pending without a working link. The inviter
// is kept for the invitee to see, and cleared if their account goes.
const questInvitations = pgTable(
  "quest_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    inviteeId: uuid("invitee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").unique(),
    linkExpiresAt: timestamp("link_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("quest_invitations_quest_invitee_idx").on(
      table.questId,
      table.inviteeId,
    ),
    index("quest_invitations_invitee_id_idx").on(table.inviteeId),
    check(
      "quest_invitations_link_complete",
      sql`(${table.tokenHash} is null) = (${table.linkExpiresAt} is null)`,
    ),
  ],
);

export { questInvitations, questMembers };
