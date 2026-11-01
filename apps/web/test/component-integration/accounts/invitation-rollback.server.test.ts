import { expect, test, vi } from "vitest";
import { hashToken, newToken } from "@/accounts/emailed-link.ts";
import { openPool } from "@/db/client.ts";
import {
  dropTestDatabase,
  resetTestDatabase,
} from "../../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../test-database/scratch-database-test-kit.ts";

test("a failed account insert rolls back invitation consumption and permits exactly one retry", async () => {
  const database = scratchDatabase("_invitation_rollback");
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database);
    const email = "rollback@example.test";
    const token = newToken();
    const tokenHash = await hashToken(token);
    await pool.query(
      "insert into invitations (email, token_hash) values ($1, $2)",
      [email, tokenHash],
    );
    await pool.query(
      "insert into active_invitations (email, token_hash) values ($1, $2)",
      [email, tokenHash],
    );
    // This database is this test's alone. Fail the insert after the claim
    // has executed, not the connection or the invitation read beforehand.
    await pool.query(`
      create function reject_account_insert() returns trigger language plpgsql
      as $$ begin raise exception 'simulated account storage failure'; end $$
    `);
    await pool.query(`
      create trigger reject_account before insert on users
      for each row execute function reject_account_insert()
    `);
    vi.stubEnv("DATABASE_URL", database.url);
    vi.resetModules();
    const { acceptInvitation, readInvitation } = await import(
      "@/accounts/invitations.ts"
    );
    await expect(acceptInvitation(token)).rejects.toThrow();
    expect(await readInvitation(token)).toBe(email);
    expect(
      (await pool.query("select id from users where email = $1", [email])).rows,
    ).toEqual([]);
    await pool.query("drop trigger reject_account on users");
    const grant = await acceptInvitation(token);
    expect(grant).toBeDefined();
    expect(
      (await pool.query("select id, role from users where email = $1", [email]))
        .rows,
    ).toEqual([{ id: grant?.id, role: "user" }]);
    expect(await readInvitation(token)).toBeUndefined();
    expect(await acceptInvitation(token)).toBeUndefined();
  } finally {
    vi.unstubAllEnvs();
    vi.resetModules();
    await pool.end();
    await dropTestDatabase(database);
  }
});
