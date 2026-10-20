import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// One row per account. The email is stored normalized (trimmed and
// lower-cased; see src/accounts/users-store.ts), so each address has one
// account however it was typed. A session carries the epoch it was signed
// in at, and only sessions at the current epoch are signed in, so raising
// it signs the user out everywhere. hidden_extras lists the ids of the
// extras the user has switched away from their default (src/flags/); the
// name is from when every extra showed by default, kept to avoid a
// migration. The name is what she asked the tutor to call her, stored
// trimmed (src/accounts/user-name.ts); null when she has none.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    sessionEpoch: integer("session_epoch").notNull().default(0),
    hiddenExtras: text("hidden_extras").array().notNull().default(sql`'{}'`),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    role: text("role").notNull().default("user"),
  },
  (table) => [
    check("users_role_valid", sql`${table.role} in ('user', 'admin')`),
    check(
      "users_email_normalized",
      sql`${table.email} = lower(btrim(${table.email})) and ${table.email} <> ''`,
    ),
    check(
      "users_name_normalized",
      sql`${table.name} is null or (${table.name} = btrim(${table.name}) and ${table.name} <> '' and char_length(${table.name}) <= 60 and ${table.name} !~ '[{}\\r\\n]')`,
    ),
  ],
);

// Emailed sign-in links, stored as the SHA-256 of each link's token, so the
// table alone signs no one in. A link works until it expires and is
// deleted with its user.
export const loginLinks = pgTable(
  "login_links",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("login_links_user_id_idx").on(table.userId)],
);
