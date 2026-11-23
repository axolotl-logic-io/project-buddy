import { integer, jsonb, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { spaces } from "./spaces.ts";

const spaceChanges = pgTable(
  "space_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    inverse: jsonb("inverse"),
  },
  (table) => [
    unique("space_changes_version_key").on(table.spaceId, table.version),
  ],
);

export { spaceChanges };
