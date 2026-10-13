import {
  type AnyPgColumn,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { users } from "./users.ts";

// A project belongs to one user, and its chats, messages and memory belong
// to the project's user (src/accounts/owner-scope.ts). interview_chat_id is
// the chat startProject opened the project with, whose opening starts the
// project's interview; null for a project made before it was recorded, or
// once that chat is deleted. The project is saved first and then pointed at
// the chat, so the two foreign keys never block an insert.
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    interviewChatId: uuid("interview_chat_id").references(
      (): AnyPgColumn => chats.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
);

// A chat's project and persona are fixed at creation. The persona is a
// snapshot, persona_name and persona_parts, taken when the chat starts, so
// editing the persona later leaves the chat as it was. persona_id is the
// built-in persona's id, or the default persona's for a persona of the
// user's own; it is still written so the build before the snapshot can read
// new chats, and goes once no build reads it. A chat saved before the
// snapshot has null snapshot columns and reads as its built-in persona: the
// id is text so personas can be added without a migration, and the chat
// store narrows it when reading, so an id no persona has reads as the
// default persona.
// The name is null until Claude Haiku first names the chat
// or she renames it; once she has, renamed_by_hand stops Haiku renaming it.
export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    personaId: text("persona_id").notNull(),
    personaName: text("persona_name"),
    personaParts: jsonb("persona_parts"),
    name: text("name"),
    renamedByHand: boolean("renamed_by_hand").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("chats_project_id_idx").on(table.projectId)],
);

// Each row is one AI SDK UIMessage. The id is the UIMessage id. The chat store
// validates the role and parts when reading.
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_chat_id_idx").on(table.chatId)],
);
