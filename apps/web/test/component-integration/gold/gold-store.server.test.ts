// The gold store against the test database: the starting grant, charges,
// and the transfer the Marketplace pays with, which moves all or nothing,
// only from the acting user, and never spends the same gold twice.
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { getDb, inTransaction } from "@/db/client.ts";
import { goldBalances } from "@/db/tables/gold.ts";
import { wholeGold } from "@/gold/gold.ts";
import {
  chargeGold,
  type GoldTransfer,
  grantStartingGold,
  readGoldBalance,
  readGoldLedger,
  transferGold,
} from "@/gold/gold-store.ts";
import { USER_ID, type UserId } from "@/ids.ts";
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
const PRICE = 25;
const PURCHASE = "purchase-1";
// Leaves a balance one micro-USD short of 12 gold, which shows as 11.
const SPENT_BEFORE_SHORT_PURCHASE = 880_001;
const SHORT_PRICE = 12;
const SHORT_BALANCE_GOLD = 11;
const SMALL_PRICE = 5;
const NEGATIVE_GOLD = -5;
const FRACTIONAL_GOLD = 1.5;
const NOT_WHOLE_GOLD: readonly number[] = [0, NEGATIVE_GOLD, FRACTIONAL_GOLD];
const ROLLED_BACK_PRICE = 30;
// Three transfers of 40 from 100 gold: two can be paid, leaving 20.
const RACING_PRICE = 40;
const LEFT_AFTER_RACE = 20;
const WAYS_PRICES = { first: 30, back: 10, again: 5, backAgain: 15 } as const;
const WAYS_NET = 10;
const UNKNOWN_USER = "00000000-0000-4000-8000-000000000000";

function sale(payee: UserId, gold: number): GoldTransfer {
  return { payee, gold, reason: "marketplace-sale", referenceId: PURCHASE };
}

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

describe("transfers", () => {
  test("a transfer moves the gold, and the ledger keeps both sides", async () => {
    const { her, other } = await twoUsers();

    expect(await transferGold(her.id, sale(other.id, PRICE))).toEqual({
      kind: "moved",
    });

    expect(await readGoldBalance(her.id)).toBe(
      STARTING_BALANCE - PRICE * ONE_GOLD,
    );
    expect(await readGoldBalance(other.id)).toBe(
      STARTING_BALANCE + PRICE * ONE_GOLD,
    );
    expect((await readGoldLedger(her.id)).at(-1)).toEqual(
      expect.objectContaining({
        reason: "marketplace-purchase",
        gold: -PRICE,
        counterparty: other.id,
        referenceId: PURCHASE,
      }),
    );
    expect((await readGoldLedger(other.id)).at(-1)).toEqual(
      expect.objectContaining({
        reason: "marketplace-sale",
        gold: PRICE,
        counterparty: her.id,
        referenceId: PURCHASE,
      }),
    );
  });

  test("a payer with less than the amount moves nothing and is told their gold", async () => {
    const { her, other } = await twoUsers();
    await chargeGold(her.id, SPENT_BEFORE_SHORT_PURCHASE);

    expect(await transferGold(her.id, sale(other.id, SHORT_PRICE))).toEqual({
      kind: "notEnoughGold",
      gold: SHORT_BALANCE_GOLD,
    });

    expect(await readGoldBalance(her.id)).toBe(
      STARTING_BALANCE - SPENT_BEFORE_SHORT_PURCHASE,
    );
    expect(await readGoldBalance(other.id)).toBe(STARTING_BALANCE);
    expect(await readGoldLedger(her.id)).toHaveLength(1);
    expect(await readGoldLedger(other.id)).toHaveLength(1);
  });

  test("a payer can spend exactly all their gold", async () => {
    const { her, other } = await twoUsers();

    expect(
      (await transferGold(her.id, sale(other.id, STARTING_GOLD))).kind,
    ).toBe("moved");

    expect(await readGoldBalance(her.id)).toBe(0);
  });

  test("a transfer to oneself, or to no account, moves nothing", async () => {
    const { her, other } = await twoUsers();
    await deleteAccount(other);

    const results = await Promise.all(
      [her.id, other.id, USER_ID.parse(UNKNOWN_USER)].map((payee) =>
        transferGold(her.id, sale(payee, SMALL_PRICE)),
      ),
    );

    expect(results).toEqual([
      { kind: "noPayee" },
      { kind: "noPayee" },
      { kind: "noPayee" },
    ]);
    expect(await readGoldBalance(her.id)).toBe(STARTING_BALANCE);
    expect(await readGoldLedger(her.id)).toHaveLength(1);
  });

  test("an amount that is not a whole gold of at least 1 moves nothing", async () => {
    const { her, other } = await twoUsers();

    const results = await Promise.allSettled(
      NOT_WHOLE_GOLD.map((gold) => transferGold(her.id, sale(other.id, gold))),
    );

    expect(results.map(({ status }) => status)).toEqual(
      NOT_WHOLE_GOLD.map(() => "rejected"),
    );
    expect(await readGoldBalance(her.id)).toBe(STARTING_BALANCE);
    expect(await readGoldBalance(other.id)).toBe(STARTING_BALANCE);
  });

  test("a transfer in a transaction that rolls back moves nothing", async () => {
    const { her, other } = await twoUsers();
    const rollBack = new Error("The purchase failed after paying");
    const moved: string[] = [];

    await expect(
      inTransaction(async (tx) => {
        const result = await transferGold(
          her.id,
          sale(other.id, ROLLED_BACK_PRICE),
          tx,
        );
        moved.push(result.kind);
        throw rollBack;
      }),
    ).rejects.toBe(rollBack);

    expect(moved).toEqual(["moved"]);
    expect(await readGoldBalance(her.id)).toBe(STARTING_BALANCE);
    expect(await readGoldBalance(other.id)).toBe(STARTING_BALANCE);
    expect(await readGoldLedger(her.id)).toHaveLength(1);
  });

  test("each user's ledger holds only their own side", async () => {
    const { her, other } = await twoUsers();
    const third = await testUser();

    await transferGold(her.id, sale(other.id, SMALL_PRICE));

    expect(await readGoldLedger(third.id)).toEqual([
      expect.objectContaining({ reason: "starting-grant" }),
    ]);
    expect((await readGoldLedger(her.id)).map(({ reason }) => reason)).toEqual([
      "starting-grant",
      "marketplace-purchase",
    ]);
  });

  test("concurrent transfers never spend the same gold twice", async () => {
    const { her, other } = await twoUsers();
    const third = await testUser();

    const results = await Promise.all(
      [other, third, other].map(({ id }) =>
        transferGold(her.id, sale(id, RACING_PRICE)),
      ),
    );

    expect(results.map(({ kind }) => kind).sort()).toEqual([
      "moved",
      "moved",
      "notEnoughGold",
    ]);
    const balances = await Promise.all(
      [her, other, third].map(({ id }) => readGoldBalance(id)),
    );
    expect(balances[0]).toBe(LEFT_AFTER_RACE * ONE_GOLD);
    expect(balances.reduce((sum, balance) => sum + balance, 0)).toBe(
      balances.length * STARTING_BALANCE,
    );
  });

  test("transfers each way between two users at once all move", async () => {
    const { her, other } = await twoUsers();

    const results = await Promise.all([
      transferGold(her.id, sale(other.id, WAYS_PRICES.first)),
      transferGold(other.id, sale(her.id, WAYS_PRICES.back)),
      transferGold(her.id, sale(other.id, WAYS_PRICES.again)),
      transferGold(other.id, sale(her.id, WAYS_PRICES.backAgain)),
    ]);

    expect(results.every(({ kind }) => kind === "moved")).toBe(true);
    expect(await readGoldBalance(her.id)).toBe(
      STARTING_BALANCE - WAYS_NET * ONE_GOLD,
    );
    expect(await readGoldBalance(other.id)).toBe(
      STARTING_BALANCE + WAYS_NET * ONE_GOLD,
    );
  });
});
