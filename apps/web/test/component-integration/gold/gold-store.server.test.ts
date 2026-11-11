// The gold store against the test database: the starting grant and charges.
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { getDb } from "@/db/client.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { wholeGold } from "@/gold/gold.ts";
import {
  chargeGold,
  grantStartingGold,
  readGoldBalance,
  readGoldLedger,
} from "@/gold/gold-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import {
  deleteAccount,
  twoUsers,
} from "../test-database/two-users-test-kit.ts";

// 1 gold, and the starting 100, in micro-USD, as balances are stored.
const ONE_GOLD = 10_000;
const STARTING_GOLD = 100;
const STARTING_BALANCE = 1_000_000;
const CALL_COST = 1250;
const CALLS_AT_ONCE = 5;
const READS_AT_ONCE = 3;

describe("the starting grant", () => {
  test("a new account has 100 gold, granted once", async () => {
    const user = await testUser();

    await grantStartingGold(user.id);

    expect(await readGoldBalance(user.id)).toBe(STARTING_BALANCE);
    expect(wholeGold(await readGoldBalance(user.id))).toBe(STARTING_GOLD);
    expect(await readGoldLedger(user.id)).toEqual([
      expect.objectContaining({
        reason: "starting-grant",
        gold: STARTING_GOLD,
        counterparty: undefined,
        referenceId: undefined,
      }),
    ]);
  });

  test("concurrent first reads of an account made with no gold grant it once", async () => {
    const user = await testUser();
    // As an account the build before gold made during the release window:
    // no balance and no ledger row.
    await getDb().delete(goldLedger).where(eq(goldLedger.userId, user.id));
    await getDb().delete(goldBalances).where(eq(goldBalances.userId, user.id));

    const balances = await Promise.all(
      Array.from({ length: READS_AT_ONCE }, () => readGoldBalance(user.id)),
    );

    expect(balances).toEqual(
      Array.from({ length: READS_AT_ONCE }, () => STARTING_BALANCE),
    );
    expect(await readGoldLedger(user.id)).toEqual([
      expect.objectContaining({
        reason: "starting-grant",
        gold: STARTING_GOLD,
      }),
    ]);
  });

  test("an account made with no balance is given its grant when it is read", async () => {
    const user = await testUser();
    await getDb().delete(goldBalances).where(eq(goldBalances.userId, user.id));

    expect(await readGoldBalance(user.id)).toBe(STARTING_BALANCE);
    // The ledger row it was first granted with stays the only grant.
    expect(await readGoldLedger(user.id)).toHaveLength(1);
  });

  test("a deleted account has no gold and is granted none", async () => {
    const { other } = await twoUsers();
    await deleteAccount(other);

    await grantStartingGold(other.id);

    expect(await readGoldBalance(other.id)).toBe(0);
  });
});

describe("charges", () => {
  test("a call's cost is taken from the balance, which may fall below 0", async () => {
    const user = await testUser();

    await chargeGold(user.id, CALL_COST);
    expect(await readGoldBalance(user.id)).toBe(STARTING_BALANCE - CALL_COST);

    await chargeGold(user.id, STARTING_BALANCE);
    expect(await readGoldBalance(user.id)).toBe(-CALL_COST);
    expect(wholeGold(await readGoldBalance(user.id))).toBe(0);
  });

  test("calls that finish together each take their own cost", async () => {
    const user = await testUser();

    await Promise.all(
      Array.from({ length: CALLS_AT_ONCE }, () =>
        chargeGold(user.id, ONE_GOLD),
      ),
    );

    expect(await readGoldBalance(user.id)).toBe(
      STARTING_BALANCE - CALLS_AT_ONCE * ONE_GOLD,
    );
  });

  test("the charge of a deleted account is dropped, unlogged", async () => {
    const { other } = await twoUsers();
    await deleteAccount(other);
    const log = spyOnErrorLog();

    await expect(chargeGold(other.id, CALL_COST)).resolves.toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });
});
