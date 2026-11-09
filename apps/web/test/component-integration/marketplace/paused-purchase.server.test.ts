// The migration's default pause through the real purchase domain, isolated
// from server files that enable their shared database's purchase gate.
import { expect, test, vi } from "vitest";
import { type Database, openPool } from "@/db/client.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { listings, purchases } from "@/db/tables/listings.ts";
import { orbBalances, orbLedger } from "@/db/tables/orbs.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import {
  dropTestDatabase,
  resetTestDatabase,
} from "../../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../test-database/scratch-database-test-kit.ts";

const PAID_PRICE = 3;
const STARTING_ORBS = 100;

// Preserve complete accounting, ownership and historical facts, including ids.
async function purchaseState(db: Database): Promise<unknown> {
  return await Promise.all([
    db.select().from(goldBalances).orderBy(goldBalances.userId),
    db.select().from(goldLedger).orderBy(goldLedger.id),
    db.select().from(orbBalances).orderBy(orbBalances.userId),
    db.select().from(orbLedger).orderBy(orbLedger.id),
    db.select().from(ownPrompts).orderBy(ownPrompts.id),
    db.select().from(purchases).orderBy(purchases.id),
    db.select().from(listings).orderBy(listings.id),
  ]);
}

test.each([0, PAID_PRICE])(
  "a paused %i-orb buy preserves balances, copies and history and still counts the attempt",
  async (price) => {
    const database = scratchDatabase("_paused_buy");
    const pool = openPool(database.url);
    try {
      await resetTestDatabase(database);
      vi.stubEnv("DATABASE_URL", database.url);
      vi.resetModules();
      const { getDb } = await import("@/db/client.ts");
      const { testUser } = await import(
        "../../support/test-database/user-test-kit.ts"
      );
      const { cloneConstruct, updateConstruct } = await import(
        "@/constructs/construct-store.ts"
      );
      const { publishListing } = await import("@/marketplace/listing-store.ts");
      const { buyListing } = await import("@/marketplace/buy-listing.ts");
      const { readOrbsBalance } = await import("@/orbs/orb-store.ts");
      const [seller, buyer] = await Promise.all([testUser(), testUser()]);
      const source = await cloneConstruct(seller.id, "vellum");
      if (source === undefined) {
        throw new Error("Missing source construct");
      }
      await updateConstruct(seller.id, source.id, {
        definition: { ...source.definition, prompt: "Help plan a birdhouse." },
      });
      const listing = await publishListing(
        seller.id,
        { kind: "construct", promptId: source.id },
        { description: "A birdhouse planning construct", price },
      );
      if (listing.kind !== "published") {
        throw new Error("The valid listing was not published");
      }
      expect(
        (await pool.query("select enabled from marketplace_cutover where id=1"))
          .rows,
      ).toEqual([{ enabled: false }]);
      expect(await readOrbsBalance(buyer.id)).toBe(STARTING_ORBS);
      expect(await readOrbsBalance(seller.id)).toBe(STARTING_ORBS);
      const before = await purchaseState(getDb());

      expect(
        await buyListing(buyer.id, {
          listingId: listing.id,
          currency: "orbs",
          price,
        }),
      ).toEqual({ kind: "paused" });

      expect(await purchaseState(getDb())).toEqual(before);
      expect(
        (
          await pool.query("select id from buddies where user_id=$1", [
            buyer.id,
          ])
        ).rows,
      ).toEqual([]);
      expect(
        (
          await pool.query("select count from rate_limits where key=$1", [
            `purchase:${buyer.id}`,
          ])
        ).rows,
      ).toEqual([{ count: 1 }]);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
      await pool.end();
      await dropTestDatabase(database);
    }
  },
);
