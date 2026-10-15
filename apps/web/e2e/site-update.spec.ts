import { expect } from "@playwright/test";
import { openPool } from "@/db/client.ts";
import {
  copyMigrationsUpTo,
  removeOldMigrations,
} from "../scripts/test-db/old-migrations.ts";
import {
  checkTestDatabase,
  checkTestEnvironment,
  dropTestDatabase,
  migrateTestDatabase,
  resetTestDatabase,
  type TestDatabase,
} from "../scripts/test-db/test-database.ts";
import { test } from "./fixtures.ts";

type Pool = ReturnType<typeof openPool>;

// The last migration before buddies and chats.buddy_* took their names
// (0010_buddies, #117).
const LAST_INDEX_BEFORE_RENAME = 9;
// A scratch database of this test's own, beside .env.test's, so the shared
// test database is never migrated back.
const SCRATCH_SUFFIX = "_migration_0010";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000002";
interface Buddy {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly parts: Readonly<Record<string, unknown>>;
  readonly clonedFrom: string;
}
interface ChatBuddy {
  readonly id: string;
  readonly buddyId: string;
  readonly buddyName: string;
  readonly buddyParts: Readonly<Record<string, unknown>>;
}
// What the old schema's rows hold, read back after the rename.
interface AfterRename {
  readonly buddies: readonly unknown[];
  readonly chats: readonly unknown[];
}
// What is left of the old names, and the new names the key, foreign key and
// index have.
interface Names {
  readonly oldTable: unknown;
  readonly oldColumns: readonly unknown[];
  readonly indexes: readonly unknown[];
  readonly constraints: readonly unknown[];
}

const BUDDY: Buddy = {
  id: "00000000-0000-4000-8000-000000000003",
  userId: USER_ID,
  name: "Captain Bevel",
  parts: { voice: "## Voice\n\nSalty.", rules: ["Ahoy."] },
  clonedFrom: "mr-tee",
};
const CHAT: ChatBuddy = {
  id: "00000000-0000-4000-8000-000000000004",
  buddyId: "mr-tee",
  buddyName: "Captain Bevel, as the chat started",
  buddyParts: { voice: "## Voice\n\nSaltier." },
};

// The scratch database: .env.test's name with SCRATCH_SUFFIX, on the same
// local server, checked as the test database is.
function scratchDatabase(): TestDatabase {
  const testDatabase = checkTestEnvironment();
  const url = new URL(testDatabase.url);
  url.pathname = `/${testDatabase.name}${SCRATCH_SUFFIX}`;
  return checkTestDatabase(url.href);
}

// A user with a buddy of her own and a chat, written with the names the
// tables had before the rename.
async function seedBeforeRename(pool: Pool): Promise<void> {
  await pool.query(
    "insert into users (id, email) values ($1, 'keep@example.com')",
    [USER_ID],
  );
  await pool.query(
    "insert into projects (id, user_id, name) values ($1, $2, 'Ship')",
    [PROJECT_ID, USER_ID],
  );
  await pool.query(
    `insert into personas (id, user_id, name, parts, cloned_from)
     values ($1, $2, $3, $4::jsonb, $5)`,
    [
      BUDDY.id,
      BUDDY.userId,
      BUDDY.name,
      JSON.stringify(BUDDY.parts),
      BUDDY.clonedFrom,
    ],
  );
  await pool.query(
    `insert into chats (id, project_id, persona_id, persona_name, persona_parts)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [
      CHAT.id,
      PROJECT_ID,
      CHAT.buddyId,
      CHAT.buddyName,
      JSON.stringify(CHAT.buddyParts),
    ],
  );
}

// The seeded values, read back with the names the tables have after it.
async function readAfterRename(pool: Pool): Promise<AfterRename> {
  const buddies = await pool.query(
    `select id, user_id as "userId", name, parts, cloned_from as "clonedFrom"
     from buddies`,
  );
  const chats = await pool.query(
    `select id, buddy_id as "buddyId", buddy_name as "buddyName",
       buddy_parts as "buddyParts"
     from chats`,
  );
  return { buddies: buddies.rows, chats: chats.rows };
}

async function readNames(pool: Pool): Promise<Names> {
  const oldTable = await pool.query(
    "select to_regclass('public.personas') as name",
  );
  const oldColumns = await pool.query(
    `select column_name as name from information_schema.columns
     where table_name = 'chats' and column_name like 'persona%'`,
  );
  const indexes = await pool.query(
    `select indexname as name from pg_indexes
     where tablename = 'buddies' order by indexname`,
  );
  const constraints = await pool.query(
    `select conname as name from pg_constraint
     where conrelid = 'public.buddies'::regclass order by conname`,
  );
  return {
    oldTable: oldTable.rows[0],
    oldColumns: oldColumns.rows,
    indexes: indexes.rows,
    constraints: constraints.rows,
  };
}

test("use_case_keep_data_through_update", async () => {
  const database = scratchDatabase();
  const oldMigrations = await copyMigrationsUpTo(LAST_INDEX_BEFORE_RENAME);
  await dropTestDatabase(database);
  try {
    await resetTestDatabase(database, oldMigrations);
    const pool = openPool(database.url);
    try {
      await seedBeforeRename(pool);
      await migrateTestDatabase(database);
      expect(await readAfterRename(pool)).toEqual({
        buddies: [BUDDY],
        chats: [CHAT],
      });
      expect(await readNames(pool)).toEqual({
        oldTable: { name: null },
        oldColumns: [],
        indexes: [{ name: "buddies_pkey" }, { name: "buddies_user_id_idx" }],
        constraints: [
          { name: "buddies_pkey" },
          { name: "buddies_user_id_users_id_fk" },
        ],
      });
    } finally {
      await pool.end();
    }
  } finally {
    await dropTestDatabase(database);
    await removeOldMigrations(oldMigrations);
  }
});
