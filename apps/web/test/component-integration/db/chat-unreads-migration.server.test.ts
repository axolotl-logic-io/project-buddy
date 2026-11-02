// Migration 0025 adds per-user unread marks and backfills them: each chat
// unread by the single chats.unread mark is unread for its owner, and
// chats.unread is left as it was for the build that is live meanwhile.
import { expect, test } from "vitest";
import { openPool } from "@/db/client.ts";
import {
  copyMigrationsUpTo,
  removeOldMigrations,
} from "../../../scripts/test-db/old-migrations.ts";
import {
  dropTestDatabase,
  migrateTestDatabase,
  resetTestDatabase,
} from "../../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../test-database/scratch-database-test-kit.ts";

const BEFORE_CHAT_UNREADS = 24;

test("the migration marks each unread chat unread for its owner and keeps chats.unread", async () => {
  const database = scratchDatabase("_chat_unreads");
  const migrations = await copyMigrationsUpTo(BEFORE_CHAT_UNREADS);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, migrations);
    const {
      rows: [owner],
    } = await pool.query<{ id: string }>(
      "insert into users (email, name) values ('owner@example.test', 'Owner') returning id",
    );
    const {
      rows: [project],
    } = await pool.query<{ id: string }>(
      "insert into projects (user_id, name) values ($1, 'Sea turtle') returning id",
      [owner?.id],
    );
    const { rows: chatsBefore } = await pool.query<{
      id: string;
      unread: boolean;
    }>(
      `insert into chats (project_id, user_id, buddy_id, unread) values
        ($1, null, 'mr-tee', true),
        ($1, null, 'mr-tee', false),
        (null, $2, 'mr-tee', true)
      returning id, unread`,
      [project?.id, owner?.id],
    );

    await migrateTestDatabase(database);

    const { rows: marks } = await pool.query<{
      chatId: string;
      userId: string;
    }>('select chat_id as "chatId", user_id as "userId" from chat_unreads');
    const unreadChats = chatsBefore
      .filter(({ unread }) => unread)
      .map(({ id }) => ({ chatId: id, userId: owner?.id }));
    expect(marks).toHaveLength(unreadChats.length);
    expect(marks).toEqual(expect.arrayContaining(unreadChats));
    const { rows: chatsAfter } = await pool.query<{
      id: string;
      unread: boolean;
    }>("select id, unread from chats");
    expect(chatsAfter).toEqual(expect.arrayContaining(chatsBefore));
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(migrations);
  }
});
