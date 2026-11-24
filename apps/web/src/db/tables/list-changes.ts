import { integer, jsonb, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { lists } from "./lists.ts";

const listChanges = pgTable(
  "list_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    inverse: jsonb("inverse"),
  },
  (table) => [
    unique("list_changes_version_key").on(table.listId, table.version),
  ],
);

export { listChanges };
