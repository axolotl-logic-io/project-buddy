import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Delivery candidates are not usable until the email service accepts them.
export const invitations = pgTable(
  "invitations",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "invitations_email_normalized",
      sql`${table.email} = lower(btrim(${table.email})) and ${table.email} <> ''`,
    ),
  ],
);

// One usable invitation per address. Removing this row consumes the link;
// replacing it revokes the previous link without changing any account.
export const activeInvitations = pgTable("active_invitations", {
  email: text("email").primaryKey(),
  tokenHash: text("token_hash")
    .notNull()
    .unique()
    .references(() => invitations.tokenHash, { onDelete: "cascade" }),
});
