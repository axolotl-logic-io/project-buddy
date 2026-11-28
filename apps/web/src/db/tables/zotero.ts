import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
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
import { lists } from "./lists.ts";
import { users } from "./users.ts";

// A user's Zotero connection: the API key that Zotero's OAuth flow gave
// Project Buddy for their personal library, which never leaves the server.
// write_access says whether the key may change the library. A row goes when
// its user disconnects or Project Buddy learns that the key no longer works.
const zoteroConnections = pgTable("zotero_connections", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  zoteroUserId: text("zotero_user_id").notNull(),
  username: text("username").notNull(),
  apiKey: text("api_key").notNull(),
  writeAccess: boolean("write_access").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A user's OAuth request while they approve access on Zotero's site: the
// temporary token and its secret, and the page to return to.
const zoteroAuthorizations = pgTable(
  "zotero_authorizations",
  {
    token: text("token").primaryKey(),
    secret: text("secret").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    returnTo: text("return_to").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("zotero_authorizations_user_idx").on(table.userId)],
);

// The Zotero side of a Zotero Collection list (a lists row of that type):
// the collection it imports from its owner's personal library, and how its
// last sync went. custom_name stops the list from following the
// collection's renames. checkmark_tag is null unless the list is checkable;
// tag_read names the tag whose checkmarks the references last read, so
// checkmarks show only while it is the checkmark tag. sync_started_at holds
// the time a running sync began. unavailable says why the collection can't
// be reached, until a sync reaches it. last_sync is the latest sync's
// result (src/zotero/zotero.ts).
const zoteroLists = pgTable(
  "zotero_lists",
  {
    listId: uuid("list_id").primaryKey(),
    questId: uuid("quest_id").notNull(),
    zoteroUserId: text("zotero_user_id").notNull(),
    collectionKey: text("collection_key").notNull(),
    collectionName: text("collection_name").notNull(),
    customName: boolean("custom_name").notNull().default(false),
    checkmarkTag: text("checkmark_tag"),
    tagRead: text("tag_read"),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    syncStartedAt: timestamp("sync_started_at", { withTimezone: true }),
    unavailable: text("unavailable"),
    lastSync: jsonb("last_sync").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.questId, table.listId],
      foreignColumns: [lists.questId, lists.id],
    }).onDelete("cascade"),
    check(
      "zotero_lists_unavailable_valid",
      sql`${table.unavailable} in ('access-ended', 'collection-missing', 'other-account')`,
    ),
  ],
);

// A reference that a Zotero Collection list imported: one bibliographic
// item directly in the collection, as its Works Cited entry. checked is the
// item's checkmark as the last sync read it, or null before a sync read the
// checkmark tag. pending is the checkmark that the next sync sends to
// Zotero, or null when there is none; mark_revision counts the marks made
// on it, so a sync can tell a mark made while it ran.
const zoteroReferences = pgTable(
  "zotero_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull(),
    listId: uuid("list_id")
      .notNull()
      .references(() => zoteroLists.listId, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    position: integer("position").notNull(),
    entry: jsonb("entry").notNull(),
    searchText: text("search_text").notNull(),
    href: text("href"),
    checked: boolean("checked"),
    pending: boolean("pending"),
    markRevision: integer("mark_revision").notNull().default(0),
  },
  (table) => [
    uniqueIndex("zotero_references_list_item_idx").on(
      table.listId,
      table.itemKey,
    ),
    index("zotero_references_list_position_idx").on(
      table.listId,
      table.position,
    ),
  ],
);

// A note on a reference of a Zotero Collection list: a child note of the
// reference's item in Zotero, or one written in Project Buddy that waits
// for the next sync to add it. note_key and version are the Zotero note's,
// null until a sync adds it. text is the note as the last sync left it,
// empty before then; plain says the note has no formatting, so it may be
// edited here. pending is the text the next sync sends, or null when there
// is none; revision counts the edits made to it, so a sync can tell an edit
// made while it ran. written_by is who last wrote the note here, or null
// for a note written in Zotero.
const zoteroNotes = pgTable(
  "zotero_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull(),
    listId: uuid("list_id")
      .notNull()
      .references(() => zoteroLists.listId, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    noteKey: text("note_key"),
    version: integer("version"),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    plain: boolean("plain").notNull(),
    pending: text("pending"),
    revision: integer("revision").notNull().default(0),
    writtenBy: uuid("written_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("zotero_notes_list_note_idx").on(table.listId, table.noteKey),
    index("zotero_notes_list_item_idx").on(
      table.listId,
      table.itemKey,
      table.position,
    ),
  ],
);

export {
  zoteroAuthorizations,
  zoteroConnections,
  zoteroLists,
  zoteroNotes,
  zoteroReferences,
};
