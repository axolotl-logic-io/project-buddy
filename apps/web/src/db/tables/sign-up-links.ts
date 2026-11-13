import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Pending email verification, separate from accounts. A fresh request replaces
// the previous link for the address. Confirmation consumes the link once.
export const signUpLinks = pgTable(
  "signup_links",
  {
    email: text("email").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "signup_links_email_normalized",
      sql`${table.email} = lower(btrim(${table.email})) and ${table.email} <> ''`,
    ),
  ],
);
