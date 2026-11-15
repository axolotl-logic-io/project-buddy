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

// The last schema before multi-user quests.
const BEFORE_MULTI_USER_QUESTS = 66;

test("multi-user quests are additive: existing accounts are signed up and the previous build's writes still work", async () => {
  const database = scratchDatabase("_migration_0067");
  const migrations = await copyMigrationsUpTo(BEFORE_MULTI_USER_QUESTS);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, migrations);
    await pool.query(
      "insert into users (email, name) values ('existing@example.test', 'Ada')",
    );
    await pool.query(
      "insert into quests (user_id, name) select id, 'Kept quest' from users where email = 'existing@example.test'",
    );
    await migrateTestDatabase(database);
    expect(
      (
        await pool.query(
          `select email, name, account_state as "accountState" from users where email = 'existing@example.test'`,
        )
      ).rows,
    ).toEqual([
      {
        email: "existing@example.test",
        name: "Ada",
        accountState: "signed_up",
      },
    ]);
    // The previous build's sign-up insert names no account state.
    await pool.query(
      "insert into users (email, name) values ('older-build@example.test', 'Bo')",
    );
    expect(
      (
        await pool.query(
          `select account_state as "accountState" from users where email = 'older-build@example.test'`,
        )
      ).rows,
    ).toEqual([{ accountState: "signed_up" }]);
    expect(
      (
        await pool.query(
          "select (select count(*) from quest_members)::int as members, (select count(*) from quest_invitations)::int as invitations, (select count(*) from quests)::int as quests",
        )
      ).rows,
    ).toEqual([{ members: 0, invitations: 0, quests: 1 }]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(migrations);
  }
});
