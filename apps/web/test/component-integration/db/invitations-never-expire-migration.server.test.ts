// #594 stops invitations expiring. Its migration keeps an invitation that
// expired before the release unusable, and leaves an unexpired one usable.
// The test migrates a scratch database of its own up to the migration before
// #594, seeds both kinds, migrates it to the latest, and reads them back.
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

// The last migration before #594 (0020_keen_shinobi_shaw).
const BEFORE_594 = 20;

test("migration keeps invitations that expired before the release unusable", async () => {
  const database = scratchDatabase("_migration_0021");
  const migrations = await copyMigrationsUpTo(BEFORE_594);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, migrations);
    await pool.query(
      `insert into invitations (email, token_hash, expires_at) values
        ('expired@example.test', 'expired-hash', now() - interval '1 hour'),
        ('pending@example.test', 'pending-hash', now() + interval '1 hour')`,
    );
    await pool.query(
      `insert into active_invitations (email, token_hash) values
        ('expired@example.test', 'expired-hash'),
        ('pending@example.test', 'pending-hash')`,
    );
    await migrateTestDatabase(database);
    const active = await pool.query(
      "select email from active_invitations order by email",
    );
    expect(active.rows).toEqual([{ email: "pending@example.test" }]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(migrations);
  }
});
