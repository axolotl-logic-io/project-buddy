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
import { projects } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// Each row is a quest invitation from when quests could be shared (#907):
// one from a project's owner (the inviter) to join the project, naming its
// invitee by user (invitee_id) or by normalized address (invitee_email),
// with the SHA-256 of its link's token. The site no longer reads or writes
// the table, and no row grants access (src/accounts/owner-scope.ts). It
// stays until a later release drops it, once no live build reads it. Rows
// go with the project, the inviter or the invitee's user.
export const projectInvitations = pgTable(
  "project_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    inviteeId: uuid("invitee_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    inviteeEmail: text("invitee_email"),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    state: text("state").notNull().default("pending"),
  },
  (table) => [
    check(
      "project_invitations_state_valid",
      sql`${table.state} in ('pending', 'accepted', 'declined', 'revoked')`,
    ),
    check(
      "project_invitations_one_invitee",
      sql`(${table.inviteeId} is null) <> (${table.inviteeEmail} is null)`,
    ),
    uniqueIndex("project_invitations_one_pending_idx")
      .on(table.projectId, table.inviteeId)
      .where(sql`${table.state} = 'pending'`),
    uniqueIndex("project_invitations_one_pending_email_idx")
      .on(table.projectId, table.inviteeEmail)
      .where(sql`${table.state} = 'pending'`),
    index("project_invitations_invitee_id_idx").on(table.inviteeId),
    index("project_invitations_invitee_email_idx").on(table.inviteeEmail),
  ],
);
