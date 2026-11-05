import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import {
  STORED_PROMPT_KIND_LIST,
  storedPromptKind,
} from "../../prompts/prompt.ts";
import { users } from "./users.ts";

// The kinds an own prompt may be, as stored, as SQL literals.
const KIND_LITERALS = sql.raw(
  STORED_PROMPT_KIND_LIST.map((kind) => `'${kind}'`).join(", "),
);

// Own constructs, activities and spells share persistence and source tracking.
// The legacy parts JSON is validated and converted by each definition's codec.
// Keep this table and its columns compatible with the live build: the table
// keeps its first name, "buddies", and a construct's stored kind is "buddy"
// (src/prompts/prompt.ts).
export const ownPrompts = pgTable(
  "buddies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default(storedPromptKind("construct")),
    name: text("name").notNull(),
    parts: jsonb("parts").notNull(),
    clonedFrom: text("cloned_from"),
    boughtFrom: uuid("bought_from"),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("buddies_user_id_idx").on(table.userId),
    check("buddies_kind_known", sql`${table.kind} in (${KIND_LITERALS})`),
  ],
);
