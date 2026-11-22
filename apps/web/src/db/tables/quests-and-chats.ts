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
import { CONSTRUCT_IDS } from "../../constructs/construct.ts";
import { users } from "./users.ts";

const CONSTRUCT_ID_LITERALS = sql
  .join(
    CONSTRUCT_IDS.map((id) => sql`${id}`),
    sql`, `,
  )
  .inlineParams();

// A quest belongs to its owner and is open to them and its accepted members
// (quest_members, src/accounts/owner-scope.ts), with its conversation,
// messages and Tasks.
export const quests = pgTable(
  "quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startingContext: text("starting_context"),
    status: text("status").notNull().default("active"),
    statusRevision: integer("status_revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dailies: boolean("dailies").notNull().default(false),
    nextTaskNumber: integer("next_task_number").notNull().default(1),
  },
  (table) => [
    index("quests_user_id_idx").on(table.userId),
    uniqueIndex("quests_dailies_user_idx")
      .on(table.userId)
      .where(sql`${table.dailies}`),
    check(
      "quests_status_valid",
      sql`${table.status} in ('active', 'completed', 'abandoned')`,
    ),
    check("quests_status_revision_valid", sql`${table.statusRevision} >= 0`),
  ],
);

// A chat is a conversation: exactly one of quest_id and user_id is set.
// A chat with quest_id is its quest's conversation. A chat with user_id is
// one that Start Day parked outside its Dailies quest for Undo
// (src/dailies/day-store.ts); no one can open it. A continuing chat is its
// quest's one conversation (src/conversations/), and the partial unique
// index allows at most one per quest, so starting one is an atomic
// get-or-create. Only a parked chat isn't continuing. construct_id names the
// built-in construct (src/constructs/) the chat is with, which the
// chats_construct_id_known check keeps to the known ids.
export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").references(() => quests.id, {
      onDelete: "cascade",
    }),
    constructId: text("construct_id").notNull(),
    spell: text("spell"),
    spellSnapshot: jsonb("spell_snapshot"),
    spellStartedAt: timestamp("spell_started_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    continuing: boolean("continuing").notNull().default(false),
  },
  (table) => [
    check("chats_spell_valid", sql`${table.spell} in ('tasks', 'brainstorm')`),
    check(
      "chats_spell_needs_quest",
      sql`${table.spell} is null or ${table.questId} is not null`,
    ),
    index("chats_quest_id_idx").on(table.questId),
    index("chats_user_id_idx").on(table.userId),
    uniqueIndex("chats_continuing_quest_idx")
      .on(table.questId)
      .where(sql`${table.continuing} and ${table.questId} is not null`),
    check(
      "chats_construct_id_known",
      sql`${table.constructId} in (${CONSTRUCT_ID_LITERALS})`,
    ),
    check(
      "chats_one_owner",
      sql`num_nonnulls(${table.questId}, ${table.userId}) = 1`,
    ),
  ],
);

// Each row is one AI SDK UIMessage. The id is the UIMessage id. The chat store
// validates the role and parts when reading. reply_started_at marks a user
// message whose reply a request is making: set when the request saves or
// claims the message, and cleared when the reply fails; null for a message
// no reply is being made to (src/chats/store.ts, claimReply). user_id is
// the author of a user message: the user who sent it, which the
// messages_user_has_author check requires. It is null on the construct's
// messages, which have no author (src/chats/message-author.ts).
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
    check(
      "messages_user_has_author",
      sql`${table.role} <> 'user' or ${table.userId} is not null`,
    ),
  ],
);
