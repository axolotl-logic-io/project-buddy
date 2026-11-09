import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

export const orbBalances = pgTable("orb_balances", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  orbs: integer("orbs").notNull(),
});

export const orbLedger = pgTable(
  "orb_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orbs: integer("orbs").notNull(),
    reason: text("reason").notNull(),
    transferId: uuid("transfer_id"),
    counterpartyId: uuid("counterparty_id").references(() => users.id, {
      onDelete: "set null",
    }),
    referenceId: text("reference_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "orb_ledger_reason_valid",
      sql`${table.reason} in ('starting-grant', 'marketplace-sale', 'marketplace-purchase')`,
    ),
    index("orb_ledger_user_id_idx").on(table.userId, table.createdAt),
    uniqueIndex("orb_ledger_one_starting_grant_idx")
      .on(table.userId)
      .where(sql`${table.reason} = 'starting-grant'`),
    uniqueIndex("orb_ledger_one_per_reference_idx")
      .on(table.userId, table.reason, table.referenceId)
      .where(sql`${table.referenceId} is not null`),
  ],
);

export const marketplaceCutover = pgTable("marketplace_cutover", {
  id: integer("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
});
