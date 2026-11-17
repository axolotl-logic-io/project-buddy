import { date, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// One authenticated visiting date per account, in UTC. No historical
// backfill: rows begin with actual visits after release. Account deletion
// removes its dates; sessions and quests have no bearing on their lifetime.
const signedInDays = pgTable(
  "signed_in_days",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    visitedOn: date("visited_on").notNull(),
  },
  (table) => [
    uniqueIndex("signed_in_days_user_date_idx").on(
      table.userId,
      table.visitedOn,
    ),
  ],
);

export { signedInDays };
