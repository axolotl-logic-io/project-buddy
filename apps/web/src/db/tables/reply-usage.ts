import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { replyRuns } from "./reply-runs.ts";
import { users } from "./users.ts";

const replyUsage = pgTable("reply_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => replyRuns.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  costMicroUsd: integer("cost_micro_usd"),
});

export { replyUsage };
