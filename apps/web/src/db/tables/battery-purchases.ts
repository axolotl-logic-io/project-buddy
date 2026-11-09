import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// An immutable offer snapshot, and the fulfillment ledger. A fulfilled row
// records the exact balance grant in the same transaction. Separate from
// the legacy ledger so the still-live build can read its known reasons.
export const batteryPurchases = pgTable("battery_purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  packageId: text("package_id").notNull(),
  priceId: text("price_id").notNull(),
  batteries: bigint("batteries", { mode: "number" }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  sessionId: text("session_id").unique(),
  paymentId: text("payment_id").unique(),
  eventId: text("event_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
});
