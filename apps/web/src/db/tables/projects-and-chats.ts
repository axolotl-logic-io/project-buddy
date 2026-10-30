import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
// to the project's user (src/accounts/owner-scope.ts); a user's standalone
// chat, which is in no project, belongs to that user.
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
);

// A chat is in a project or belongs directly to a user, with no project:
// exactly one of project_id and user_id is set. A user can have many
// standalone chats. A chat's place and buddy are fixed at creation.
// The buddy is a
// snapshot, buddy_name and buddy_parts, taken when the chat starts, so
// editing the buddy later leaves the chat as it was. buddy_id is the
// built-in buddy's id, or the default buddy's for a buddy of the
// user's own; it is still written so the build before the snapshot can read
// new chats, and goes once no build reads it. A chat saved before the
// snapshot has null snapshot columns and reads as its built-in buddy: the
// id is text so buddies can be added without a migration, and the chat
// store narrows it when reading, so an id no buddy has reads as the
// default buddy.
// The name is null until Claude Haiku first names the chat or the user
// renames it; once they have, renamed_by_hand stops Haiku renaming it.
export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    buddyId: text("buddy_id").notNull(),
    buddyName: text("buddy_name"),
    buddyParts: jsonb("buddy_parts"),
    name: text("name"),
    renamedByHand: boolean("renamed_by_hand").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    index("chats_project_id_idx").on(table.projectId),
    index("chats_user_id_idx").on(table.userId),
    check(
      "chats_one_owner",
      sql`num_nonnulls(${table.projectId}, ${table.userId}) = 1`,
    ),
  ],
);

// Each row is one AI SDK UIMessage. The id is the UIMessage id. The chat store
// validates the role and parts when reading. reply_started_at marks a user
// message whose reply a request is making: set when the request saves or
// claims the message, and cleared when the reply fails; null for a message
// no reply is being made to (src/chats/store.ts, claimReply).
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    replyStartedAt: timestamp("reply_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_chat_id_idx").on(table.chatId)],
);
