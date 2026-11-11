import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { batteryPurchases } from "./battery-purchases.ts";

// Provider observations, not balance deltas. Amounts for different states
// of one object must never be summed as separate refunds or deductions.
export const batteryCashEvents = pgTable("battery_cash_events", {
  eventId: text("event_id").primaryKey(),
  purchaseId: uuid("purchase_id")
    .notNull()
    .references(() => batteryPurchases.id),
  objectId: text("object_id").notNull(),
  kind: text("kind").notNull(),
  eventType: text("event_type").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
