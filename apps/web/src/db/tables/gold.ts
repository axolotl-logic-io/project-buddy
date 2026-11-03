import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { users } from "./users.ts";

// Each user's gold (src/gold/gold.ts), in millionths of a US dollar of model
// spend: one row per user, made with the account. Model calls take their
// cost from it in place, so it may fall slightly below 0.
export const goldBalances = pgTable("gold_balances", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  microUsd: bigint("micro_usd", { mode: "number" }).notNull(),
});

// Every grant and transfer of gold, for audit: one row for each balance it
// changed, by micro_usd (negative for the user who paid), with why and the
// ids it relates to. A transfer writes two rows, the payer's and the
// payee's, sharing its transfer_id; counterparty_id names the other user,
// and becomes null when that account is deleted. Model-call charges are not
// written here. A user has at most one starting grant.
export const goldLedger = pgTable(
  "gold_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    microUsd: bigint("micro_usd", { mode: "number" }).notNull(),
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
      "gold_ledger_reason_valid",
      sql`${table.reason} in ('starting-grant', 'marketplace-sale', 'marketplace-purchase')`,
    ),
    index("gold_ledger_user_id_idx").on(table.userId, table.createdAt),
    uniqueIndex("gold_ledger_one_starting_grant_idx")
      .on(table.userId)
      .where(sql`${table.reason} = 'starting-grant'`),
  ],
);
