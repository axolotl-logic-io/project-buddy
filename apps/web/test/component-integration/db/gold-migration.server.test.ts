/// <reference types="vite/client" />
// Migration 0030_gold against a scratch database left as the release before
// gold left it: each existing user is given the starting 100 gold once, and
// running its backfill again grants nothing twice.
import { expect, test } from "vitest";
import { z } from "zod";
import { openPool } from "@/db/client.ts";
import goldMigration from "../../../drizzle/0030_gold.sql?raw";
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

// The last migration before gold.
const BEFORE_GOLD = 29;
const BACKFILL_HEADING = "-- Backfill";
const SEEDED_EMAIL = "spent@example.test";
// The starting 100 gold, in micro-USD.
const STARTING_BALANCE = 1_000_000;

const GOLD_ROWS = z.array(
  z.object({
    email: z.string(),
    microUsd: z.coerce.number(),
    grants: z.coerce.number(),
  }),
);

// The migration's backfill: its statements from the heading on, whose
// breakpoint markers are SQL comments, so they run as one query.
function backfill(): string {
  return goldMigration.slice(goldMigration.indexOf(BACKFILL_HEADING));
}

test("the backfill gives each existing user 100 gold once, also when run again", async () => {
  const database = scratchDatabase("_gold");
  const migrations = await copyMigrationsUpTo(BEFORE_GOLD);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, migrations);
    await pool.query("insert into users (email) values ($1)", [SEEDED_EMAIL]);
    await pool.query(
      "insert into monthly_spend (user_id, month, micro_usd) select id, '2026-10-01', 5000000 from users",
    );

    await migrateTestDatabase(database);
    await pool.query(backfill());

    // Every user: the one seeded here, and the initial admin an earlier
    // migration made.
    const { rows } = await pool.query(`
      select u.email, b.micro_usd as "microUsd",
        (select count(*) from gold_ledger l
          where l.user_id = u.id and l.reason = 'starting-grant') as grants
      from users u left join gold_balances b on b.user_id = u.id`);
    const gold = GOLD_ROWS.parse(rows);
    expect(gold.map(({ email }) => email)).toContain(SEEDED_EMAIL);
    expect(gold.map(({ microUsd, grants }) => ({ microUsd, grants }))).toEqual(
      gold.map(() => ({ microUsd: STARTING_BALANCE, grants: 1 })),
    );
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(migrations);
  }
});
