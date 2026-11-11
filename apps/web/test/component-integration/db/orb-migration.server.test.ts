/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { openPool } from "@/db/client.ts";
import orbMigration from "../../../drizzle/0048_safe_anita_blake.sql?raw";
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

const BEFORE_ORBS = 47;
const ORB_ROLLOUT = 48;
const STARTING = 100;
const REMAINING = 7;
const LEGACY_PRICE = 99;
const LEGACY_BUYER = "00000000-0000-4000-8000-000000000779";
const LEGACY_SELLER = "00000000-0000-4000-8000-000000000780";
const LISTING = "00000000-0000-4000-8000-000000000781";

test("orb rollout preserves gold purchases and prices, grants once and blocks both builds until cutover", async () => {
  const database = scratchDatabase("_orbs");
  const migrations = await copyMigrationsUpTo(BEFORE_ORBS);
  const rollout = await copyMigrationsUpTo(ORB_ROLLOUT);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, migrations);
    await pool.query(
      "insert into users (id,email) values ($1,'buyer@example.test'), ($2,'seller@example.test')",
      [LEGACY_BUYER, LEGACY_SELLER],
    );
    await pool.query(
      "insert into listings (id,seller_id,source_id,kind,name,parts,description,price) values ($1,$2,gen_random_uuid(),'buddy','Legacy','{}','', $3)",
      [LISTING, LEGACY_SELLER, LEGACY_PRICE],
    );
    await pool.query(
      "insert into purchases (listing_id,buyer_id,price) values ($1,$2,$3)",
      [LISTING, LEGACY_BUYER, LEGACY_PRICE],
    );
    await migrateTestDatabase(database, rollout);
    const { rows: balances } = await pool.query(
      "select orbs from orb_balances where user_id=$1",
      [LEGACY_BUYER],
    );
    expect(balances).toEqual([{ orbs: STARTING }]);
    await pool.query("update orb_balances set orbs=$1 where user_id=$2", [
      REMAINING,
      LEGACY_BUYER,
    ]);
    const backfill = orbMigration.slice(orbMigration.indexOf("-- Backfill:"));
    await pool.query(backfill);
    const { rows: after } = await pool.query(
      "select orbs from orb_balances where user_id=$1",
      [LEGACY_BUYER],
    );
    expect(after).toEqual([{ orbs: REMAINING }]);
    const { rows: grants } = await pool.query(
      "select count(*)::integer as count from orb_ledger where user_id=$1 and reason='starting-grant'",
      [LEGACY_BUYER],
    );
    expect(grants).toEqual([{ count: 1 }]);
    await pool.query("insert into users (email) values ('new@example.test')");
    const { rows: added } = await pool.query(
      "select b.orbs from users u join orb_balances b on b.user_id=u.id where email='new@example.test'",
    );
    expect(added).toEqual([{ orbs: STARTING }]);
    const { rows: historical } = await pool.query(
      "select currency,price from purchases where buyer_id=$1",
      [LEGACY_BUYER],
    );
    expect(historical).toEqual([{ currency: "gold", price: LEGACY_PRICE }]);
    const { rows: listing } = await pool.query(
      "select currency,price from listings where id=$1",
      [LISTING],
    );
    expect(listing).toEqual([{ currency: "gold", price: LEGACY_PRICE }]);
    await expect(
      pool.query(
        "insert into purchases (listing_id,buyer_id,price) values ($1,$2,0)",
        [LISTING, LEGACY_BUYER],
      ),
    ).rejects.toThrow("Marketplace purchases are paused or require orbs");
    await expect(
      pool.query(
        "insert into purchases (listing_id,buyer_id,price,currency) values ($1,$2,0,'orbs')",
        [LISTING, LEGACY_BUYER],
      ),
    ).rejects.toThrow("Marketplace purchases are paused or require orbs");
    await pool.query("update marketplace_cutover set enabled=true where id=1");
    await expect(
      pool.query(
        "insert into purchases (listing_id,buyer_id,price) values ($1,$2,0)",
        [LISTING, LEGACY_BUYER],
      ),
    ).rejects.toThrow("Marketplace purchases are paused or require orbs");
    await expect(
      pool.query("update listings set currency='orbs' where id=$1", [LISTING]),
    ).rejects.toThrow();
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(migrations);
    await removeOldMigrations(rollout);
  }
});
