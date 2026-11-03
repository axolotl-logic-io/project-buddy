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

// Each row is one invitation from a project's owner (the inviter) to join the
// project (src/projects/project-invitations.ts). It names its invitee in one
// of two ways: by user (invitee_id), for an address that had an account when
// it was sent, or by normalized address alone (invitee_email), for one that
// had none, which whoever has that address now may answer. The invitee acts
// on it; the project's owner sees and revokes it (src/accounts/
// owner-scope.ts). The invitation email's link holds a random token, and the
// row holds only its SHA-256. A project has at most one pending invitation
// per invitee: a newer one revokes it. Rows stay once acted on, as accepted,
// declined or revoked, and go with the project, the inviter or the invitee's
// user.
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
