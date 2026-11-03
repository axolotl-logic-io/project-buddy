import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// One row per push subscription: a browser on one of the user's devices
// where she turned notifications on. The endpoint is the push service's URL
// for that browser, unique to it, so it is the key; p256dh and auth are the
// browser's keys that encrypt each notification. device names the browser
// that holds it, as its push_device cookie does, so signing out there finds
// the row even after the browser has renewed its subscription; a row saved
// before the column has none. A row goes when she turns notifications off,
// when she signs out of its browser or everywhere, when the push service
// says the subscription is gone, or with its user.
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    endpoint: text("endpoint").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    device: text("device"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("push_subscriptions_user_id_idx").on(table.userId),
    index("push_subscriptions_device_idx").on(table.device),
  ],
);
