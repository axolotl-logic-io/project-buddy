import {
  bigint,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// When each account last reported following a timer schedule (work and
// break minutes and start instant): one row per account and schedule,
// deleted with the account. Rows hold no quest or account data beyond the
// account's id, and are deleted once they are older than the presence
// expiry (src/timer/presence-store.ts).
const timerPresence = pgTable(
  "timer_presence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workMinutes: integer("work_minutes").notNull(),
    breakMinutes: integer("break_minutes").notNull(),
    startMs: bigint("start_ms", { mode: "number" }).notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("timer_presence_user_schedule_idx").on(
      table.userId,
      table.workMinutes,
      table.breakMinutes,
      table.startMs,
    ),
    index("timer_presence_schedule_idx").on(
      table.workMinutes,
      table.breakMinutes,
      table.startMs,
      table.reportedAt,
    ),
    index("timer_presence_reported_at_idx").on(table.reportedAt),
  ],
);

export { timerPresence };
