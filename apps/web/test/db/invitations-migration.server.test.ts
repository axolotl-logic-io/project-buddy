import { expect, test } from "vitest";
import { z } from "zod";
import { openPool } from "@/db/client.ts";
import {
  copyMigrationsUpTo,
  removeOldMigrations,
} from "../../scripts/test-db/old-migrations.ts";
import {
  dropTestDatabase,
  migrateTestDatabase,
  resetTestDatabase,
} from "../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../test-database/scratch-database-test-kit.ts";

const BEFORE_INVITATIONS = 12;
const ADMIN_EMAIL = "me@modestprogress.com";

test.each([true, false])(
  "migration provisions or promotes only the initial admin, preserving existing data (already present: %s)",
  async (alreadyPresent) => {
    const database = scratchDatabase(`_invites_${String(alreadyPresent)}`);
    const migrations = await copyMigrationsUpTo(BEFORE_INVITATIONS);
    const pool = openPool(database.url);
    try {
      await resetTestDatabase(database, migrations);
      const email = "ordinary@example.test";
      await pool.query(
        "insert into users (email, name, session_epoch, hidden_extras) values ($1, 'Learner', 7, '{usage-meter}')",
        [email],
      );
      if (alreadyPresent) {
        await pool.query(
          "insert into users (email, name) values ($1, 'Owner')",
          [ADMIN_EMAIL],
        );
      }
      const before = await pool.query("select * from users order by email");
      await migrateTestDatabase(database);
      const after = await pool.query("select * from users order by email");
      expect(after.rows).toHaveLength(2);
      expect(after.rows).toContainEqual(
        expect.objectContaining({ email: ADMIN_EMAIL, role: "admin" }),
      );
      for (const row of before.rows) {
        const stored = z.object({ email: z.string() }).parse(row);
        let role = "user";
        if (stored.email === ADMIN_EMAIL) {
          role = "admin";
        }
        expect(after.rows).toContainEqual(
          expect.objectContaining({ ...row, role }),
        );
      }
    } finally {
      await pool.end();
      await dropTestDatabase(database);
      await removeOldMigrations(migrations);
    }
  },
);
