import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { users } from "./users.ts";

// A project belongs to one user, its owner, and is open, with its chats,
// messages and memory, to its owner and its members (project_members,
// src/accounts/owner-scope.ts); a user's standalone chat, which is in no
// project, belongs to that user alone.
// check_in_frequency is how often the project's construct checks in
// (src/check-ins/): one of CHECK_IN_FREQUENCIES, "off" until the user turns
// check-ins on. last_check_in_at is when the latest check-in was claimed,
// null before the first.
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    statusRevision: integer("status_revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    checkInFrequency: text("check_in_frequency").notNull().default("off"),
    lastCheckInAt: timestamp("last_check_in_at", { withTimezone: true }),
    dailies: boolean("dailies").notNull().default(false),
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    uniqueIndex("projects_dailies_user_idx")
      .on(table.userId)
      .where(sql`${table.dailies}`),
    check(
      "projects_status_valid",
      sql`${table.status} in ('active', 'completed', 'abandoned')`,
    ),
    check("projects_status_revision_valid", sql`${table.statusRevision} >= 0`),
    check(
      "projects_check_in_frequency_valid",
      sql`${table.checkInFrequency} in ('off', 'daily', 'few-times-a-week', 'weekly')`,
    ),
  ],
);

// A chat is a conversation, in a project or belonging directly to a user,
// with no project: exactly one of project_id and user_id is set. A
// continuing chat is the one conversation of its place: a quest's
// conversation or a user's private Chat (src/conversations/). The partial
// unique indexes allow at most one continuing chat per project and per user,
// so starting one is an atomic get-or-create. A chat that isn't continuing is
// a legacy adventure, which the site no longer reads: they stay until a
// later release, after this one is live, deletes them (#898).
// buddy_name and buddy_parts are the construct's snapshot, and
// buddy_id the built-in construct's id, or the default construct's for a
// construct of the user's own, so builds that read only ids keep working.
// The construct is chosen when the chat starts and kept as it was then, so
// editing the construct later leaves the chat as it is. A chat saved before the snapshot has null
// snapshot columns and reads as its built-in construct: the id is text so
// constructs can be added without a migration, and the chat store narrows it
// when reading, so an id no construct has reads as the default construct.
// name and renamed_by_hand are a legacy adventure's name, which nothing
// writes any more. They stay for now: dropping them needs a later release,
// after a build that neither reads nor writes them is live.
// Unread marks are per user, in chat_unreads (chat-unreads.ts).
export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    constructId: text("buddy_id").notNull(),
    constructName: text("buddy_name"),
    constructParts: jsonb("buddy_parts"),
    name: text("name"),
    renamedByHand: boolean("renamed_by_hand").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    continuing: boolean("continuing").notNull().default(false),
  },
  (table) => [
    index("chats_project_id_idx").on(table.projectId),
    index("chats_user_id_idx").on(table.userId),
    uniqueIndex("chats_continuing_project_idx")
      .on(table.projectId)
      .where(sql`${table.continuing} and ${table.projectId} is not null`),
    uniqueIndex("chats_continuing_user_idx")
      .on(table.userId)
      .where(sql`${table.continuing} and ${table.userId} is not null`),
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
// no reply is being made to (src/chats/store.ts, claimReply). user_id is
// the author of a user message: the user who sent it. Null means the chat's
// owner, as on every message saved before authors were recorded, and on the
// construct's messages, which have no author (src/chats/message-author.ts).
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    replyStartedAt: timestamp("reply_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_chat_id_idx").on(table.chatId),
    index("messages_user_id_idx").on(table.userId),
  ],
);
