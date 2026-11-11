// Migrations 0051 and 0052 against a scratch database left as the release
// before them: 0051 adds continuing conversations and keeps every adventure
// for the build that is live meanwhile, and 0052 removes the adventures and
// what belongs to them, keeping accounts, balances, own definitions and the
// quests with their Journals and Progress.
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

// The last migration before continuing conversations, and the one that adds
// them.
const BEFORE_CONVERSATIONS = 50;
const CONTINUING_CONVERSATIONS = 51;

// The adventures the scene starts with: two in its quest and one standalone.
const ADVENTURES = 3;

// One row's id, as an insert … returning id gives it.
async function insertedId(
  pool: ReturnType<typeof openPool>,
  query: string,
  values: readonly unknown[],
): Promise<string> {
  const {
    rows: [row],
  } = await pool.query<{ id: string }>(query, [...values]);
  if (row === undefined) {
    throw new Error(`Nothing inserted: ${query}`);
  }
  return row.id;
}

// How many rows the query counts.
async function count(
  pool: ReturnType<typeof openPool>,
  query: string,
): Promise<number> {
  const {
    rows: [row],
  } = await pool.query<{ n: string }>(query);
  return Number(row?.n ?? 0);
}

test("the cutover removes adventures and what they own, and keeps accounts, balances, definitions and quests", async () => {
  const database = scratchDatabase("_remove_adventures");
  const [before, throughAdditive] = await Promise.all([
    copyMigrationsUpTo(BEFORE_CONVERSATIONS),
    copyMigrationsUpTo(CONTINUING_CONVERSATIONS),
  ]);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    const user = await insertedId(
      pool,
      "insert into users (email, name) values ('owner@example.test', 'Owner') returning id",
      [],
    );
    await pool.query(
      "insert into gold_balances (user_id, micro_usd) values ($1, 4200000) on conflict (user_id) do update set micro_usd = 4200000",
      [user],
    );
    await pool.query(
      "insert into buddies (user_id, kind, name, parts) values ($1, 'buddy', 'Moss', '{}'::jsonb)",
      [user],
    );
    const project = await insertedId(
      pool,
      "insert into projects (user_id, name) values ($1, 'Sea turtle') returning id",
      [user],
    );
    await pool.query(
      "insert into memory_versions (project_id, version, text, author, user_id) values ($1, 1, 'Model a turtle', 'user', $2)",
      [project, user],
    );
    const adventure = await insertedId(
      pool,
      "insert into chats (project_id, buddy_id) values ($1, 'vellum') returning id",
      [project],
    );
    await insertedId(
      pool,
      "insert into chats (project_id, buddy_id) values ($1, 'lumen') returning id",
      [project],
    );
    await insertedId(
      pool,
      "insert into chats (user_id, buddy_id) values ($1, 'vellum') returning id",
      [user],
    );
    await pool.query(
      `insert into messages (id, chat_id, role, parts) values ('m1', $1, 'user', '[]'::jsonb)`,
      [adventure],
    );
    await pool.query(
      "insert into images (chat_id, media_type, data) values ($1, 'image/png', 'AA==')",
      [adventure],
    );
    await pool.query(
      "insert into chat_unreads (chat_id, user_id) values ($1, $2)",
      [adventure, user],
    );
    await pool.query(
      "insert into milestones (project_id, chat_id, text) values ($1, $2, 'Modelled the shell')",
      [project, adventure],
    );
    await pool.query(
      `insert into plan_versions (project_id, version, plan, lines, undo, author, user_id, chat_id)
       values ($1, 1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'person', $2, $3)`,
      [project, user, adventure],
    );
    await pool.query(
      `insert into activity_sessions (chat_id, activity_id, activity_name, activity_parts)
       values ($1, 'open-chat', 'Chat', '{}'::jsonb)`,
      [adventure],
    );
    await pool.query(
      `insert into image_generations (user_id, chat_id, request_id, prompt, cost_micro_usd)
       values ($1, $2, 'request-1', 'A turtle', 100)`,
      [user, adventure],
    );
    await pool.query(
      "insert into reply_runs (chat_id, message_id, user_id) values ($1, 'm1', $2)",
      [adventure, user],
    );

    // 0051 alone, as the live build runs on it: every adventure stays.
    await migrateTestDatabase(database, throughAdditive);
    expect(await count(pool, "select count(*) as n from chats")).toBe(
      ADVENTURES,
    );

    await migrateTestDatabase(database);

    expect(await count(pool, "select count(*) as n from chats")).toBe(0);
    expect(await count(pool, "select count(*) as n from messages")).toBe(0);
    expect(await count(pool, "select count(*) as n from images")).toBe(0);
    expect(await count(pool, "select count(*) as n from chat_unreads")).toBe(0);
    const { rows: kept } = await pool.query<{
      users: string;
      balance: string;
      prompts: string;
      projects: string;
      journal: string;
    }>(
      `select
        (select count(*) from users where id = $1) as users,
        (select micro_usd from gold_balances where user_id = $1) as balance,
        (select count(*) from buddies where user_id = $1) as prompts,
        (select count(*) from projects where id = $2) as projects,
        (select text from memory_versions where project_id = $2) as journal`,
      [user, project],
    );
    expect(kept).toEqual([
      {
        users: "1",
        balance: "4200000",
        prompts: "1",
        projects: "1",
        journal: "Model a turtle",
      },
    ]);
    const { rows: milestones } = await pool.query(
      'select text, chat_id as "chatId" from milestones where project_id = $1',
      [project],
    );
    expect(milestones).toEqual([{ text: "Modelled the shell", chatId: null }]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await Promise.all([
      removeOldMigrations(before),
      removeOldMigrations(throughAdditive),
    ]);
  }
});
