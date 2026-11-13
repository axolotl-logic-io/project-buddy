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

// The last schema with account invitations.
const BEFORE_PUBLIC_SIGNUP = 62;

test("public sign-up rollout retains invitation storage for the previous build", async () => {
  const database = scratchDatabase("_migration_0063");
  const migrations = await copyMigrationsUpTo(BEFORE_PUBLIC_SIGNUP);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, migrations);
    await pool.query(
      "insert into users (email) values ('existing@example.test')",
    );
    await pool.query(
      "insert into invitations (email, token_hash) values ('pending@example.test', 'pending-hash')",
    );
    await pool.query(
      "insert into active_invitations (email, token_hash) values ('pending@example.test', 'pending-hash')",
    );
    await migrateTestDatabase(database);
    expect(
      (
        await pool.query(
          "select to_regclass('invitations') as invitations, to_regclass('active_invitations') as active",
        )
      ).rows,
    ).toEqual([{ invitations: "invitations", active: "active_invitations" }]);
    expect(
      (
        await pool.query(
          "select email from users where email = 'existing@example.test'",
        )
      ).rows,
    ).toEqual([{ email: "existing@example.test" }]);
    expect(
      (await pool.query("select email from active_invitations")).rows,
    ).toEqual([{ email: "pending@example.test" }]);
    await pool.query(
      "insert into invitations (email, token_hash) values ('older-build@example.test', 'older-build-hash')",
    );
    expect((await pool.query("select email from signup_links")).rows).toEqual(
      [],
    );
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(migrations);
  }
});
