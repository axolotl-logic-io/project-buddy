import { expect, test, vi } from "vitest";
import { hashToken, newToken } from "@/accounts/emailed-link.ts";
import { openPool } from "@/db/client.ts";
import {
  dropTestDatabase,
  resetTestDatabase,
} from "../../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../test-database/scratch-database-test-kit.ts";

const LINK_LIFETIME_MS = 60_000;

test("a failed account insert rolls back sign-up consumption and permits exactly one retry", async () => {
  const database = scratchDatabase("_signup_rollback");
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database);
    const email = "rollback@example.test";
    const token = newToken();
    const tokenHash = await hashToken(token);
    const now = new Date();
    await pool.query(
      "insert into signup_links (email, token_hash, expires_at) values ($1, $2, $3)",
      [email, tokenHash, new Date(now.getTime() + LINK_LIFETIME_MS)],
    );
    // This database is this test's alone. Fail the insert after the claim
    // has executed, not the connection or the sign-up read beforehand.
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
    const { confirmSignUp, readSignUpEmail } = await import(
      "@/accounts/sign-up-links.ts"
    );
    await expect(confirmSignUp(token, now)).rejects.toThrow();
    expect(await readSignUpEmail(token, now)).toBe(email);
    expect(
      (await pool.query("select id from users where email = $1", [email])).rows,
    ).toEqual([]);
    await pool.query("drop trigger reject_account on users");
    const grant = await confirmSignUp(token, now);
    expect(grant).toBeDefined();
    expect(
      (await pool.query("select id, role from users where email = $1", [email]))
        .rows,
    ).toEqual([{ id: grant?.id, role: "user" }]);
    expect(await readSignUpEmail(token, now)).toBeUndefined();
    expect(await confirmSignUp(token, now)).toBeUndefined();
  } finally {
    const { closeDb } = await import("@/db/client.ts");
    await closeDb();
    vi.unstubAllEnvs();
    vi.resetModules();
    await pool.end();
    await dropTestDatabase(database);
  }
});
