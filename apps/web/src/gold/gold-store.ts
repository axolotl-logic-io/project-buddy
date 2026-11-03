// Each user's gold (gold.ts), stored in Postgres's gold_balances, and the
// ledger of every grant and transfer of it, gold_ledger. A balance is made
// with its account, holding the starting grant; model calls take their cost
// from it in place (spend-meter.ts), and the Marketplace moves it between
// users with transferGold. An account that has no balance yet, such as one
// made while the build before gold was live, is given its starting grant
// the first time its balance is read or paid from.
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  goldBalanceOwnedBy,
  goldBalancesOfTransfer,
  goldLedgerOwnedBy,
} from "@/accounts/owner-scope.ts";
import {
  type Database,
  getDb,
  inTransaction,
  type Transaction,
} from "@/db/client.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { users } from "@/db/tables/users.ts";
import { databaseErrorCase } from "@/errors/neon-errors.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  goldInMicroUsd,
  goldOfMicroUsd,
  STARTING_GOLD,
  wholeGold,
} from "@/gold/gold.ts";
import { parseUserId, type UserId } from "@/ids.ts";

// Why gold moved from one user to another: a Marketplace sale, where the
// buyer pays the seller.
type GoldTransferReason = "marketplace-sale";

// A transfer of gold to payee, from the user who pays it.
interface GoldTransfer {
  readonly payee: UserId;
  // Whole gold, at least 1.
  readonly gold: number;
  readonly reason: GoldTransferReason;
  // What the transfer is for, such as the Marketplace purchase's id; the
  // ledger keeps it with both sides of the transfer.
  readonly referenceId: string;
}

// What a transfer did: moved the gold, or moved nothing because the payer
// has less than the amount (their balance in whole gold) or there is no one
// else to pay (payee is the payer, or has no account).
type GoldTransferResult =
  | { readonly kind: "moved" }
  | { readonly kind: "notEnoughGold"; readonly gold: number }
  | { readonly kind: "noPayee" };

// Why a ledger row changed its user's gold.
type GoldLedgerReason =
  | "starting-grant"
  | "marketplace-sale"
  | "marketplace-purchase";

// A grant or transfer that changed a user's gold, as the ledger keeps it.
interface GoldLedgerEntry {
  readonly reason: GoldLedgerReason;
  // Whole gold: added, or negative when the user paid.
  readonly gold: number;
  // The other user of a transfer, while their account exists.
  readonly counterparty: UserId | undefined;
  readonly referenceId: string | undefined;
  readonly createdAt: Date;
}

// The ledger rows each side of a transfer writes.
const TRANSFER_LEDGER_REASONS: Readonly<
  Record<
    GoldTransferReason,
    { readonly payer: GoldLedgerReason; readonly payee: GoldLedgerReason }
  >
> = {
  "marketplace-sale": {
    payer: "marketplace-purchase",
    payee: "marketplace-sale",
  },
};

const LEDGER_ROW = z.object({
  reason: z.enum([
    "starting-grant",
    "marketplace-sale",
    "marketplace-purchase",
  ]),
  microUsd: z.number(),
  counterpartyId: z.string().nullable(),
  referenceId: z.string().nullable(),
  createdAt: z.date(),
});

// How long chargeGold waits before each retry of a charge the database
// couldn't be reached for, in milliseconds: so at most 3 attempts in all.
const FIRST_RETRY_DELAY_MS = 100;
const SECOND_RETRY_DELAY_MS = 400;
const CHARGE_RETRY_DELAYS_MS: readonly number[] = [
  FIRST_RETRY_DELAY_MS,
  SECOND_RETRY_DELAY_MS,
];

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// Gives each of accounts that has no balance yet its starting grant: the
// balance and its ledger row, in one statement. Ids with no account are
// skipped, so are accounts that have a balance, so it never grants twice.
async function grantMissingStartingGold(
  db: Database | Transaction,
  accounts: readonly UserId[],
): Promise<void> {
  const microUsd = goldInMicroUsd(STARTING_GOLD);
  // The rows it writes are those of the accounts named, by the select from
  // users, so it needs no ownership predicate (src/accounts/owner-scope.ts).
  await db.execute(sql`
    with granted as (
      insert into gold_balances (user_id, micro_usd)
      select id, ${microUsd} from ${users} where ${inArray(users.id, [...accounts])}
      on conflict do nothing
      returning user_id
    )
    insert into gold_ledger (user_id, micro_usd, reason)
    select user_id, ${microUsd}, 'starting-grant' from granted
    on conflict do nothing
  `);
}

// Gives owner's new account its starting gold, once: an account that has
// it already, or no longer exists, is left as it is.
async function grantStartingGold(owner: UserId): Promise<void> {
  await withAppErrors("grantStartingGold", () =>
    grantMissingStartingGold(getDb(), [owner]),
  );
}

async function selectBalance(owner: UserId): Promise<number | undefined> {
  const [row] = await getDb()
    .select({ microUsd: goldBalances.microUsd })
    .from(goldBalances)
    .where(goldBalanceOwnedBy(owner));
  return row?.microUsd;
}

// Owner's gold, in micro-USD (gold.ts), which may be slightly below 0. An
// account with no balance yet is given its starting grant first; one that
// no longer exists has none.
async function readGoldBalance(owner: UserId): Promise<number> {
  return await withAppErrors("readGoldBalance", async () => {
    const balance = await selectBalance(owner);
    if (balance !== undefined) {
      return balance;
    }
    await grantMissingStartingGold(getDb(), [owner]);
    return (await selectBalance(owner)) ?? 0;
  });
}

async function chargeRetrying(
  owner: UserId,
  microUsd: number,
  retryDelays: readonly number[],
): Promise<void> {
  try {
    await getDb()
      .update(goldBalances)
      .set({ microUsd: sql`${goldBalances.microUsd} - ${microUsd}` })
      .where(goldBalanceOwnedBy(owner));
  } catch (error) {
    const [delay, ...laterDelays] = retryDelays;
    if (
      delay === undefined ||
      databaseErrorCase(error) !== "database-unreachable"
    ) {
      throw error;
    }
    await wait(delay);
    await chargeRetrying(owner, microUsd, laterDelays);
  }
}

// Takes microUsd, a model call's cost, from owner's gold in one statement,
// so calls that finish together each take their own cost; the balance may
// go below 0. A charge to an account that no longer exists, such as one
// deleted while a reply finished, is dropped: that is not a failure. While
// the database can't be reached, the charge is tried again after each of
// CHARGE_RETRY_DELAYS_MS; one that committed but whose answer was lost may
// then be taken twice, which errs toward the user paying.
// Any other failure, or the last unreachable one, rejects with a logged
// AppError, and that charge is lost.
function chargeGold(owner: UserId, microUsd: number): Promise<void> {
  return withAppErrors("chargeGold", () =>
    chargeRetrying(owner, microUsd, CHARGE_RETRY_DELAYS_MS),
  );
}

// Takes microUsd from owner's gold within tx, if owner has at least that
// much, and says whether it did. Owner's balance stays locked until tx
// ends, so the gold checked is the gold taken.
async function reserveGold(
  tx: Transaction,
  owner: UserId,
  microUsd: number,
): Promise<boolean> {
  const [reserved] = await tx
    .update(goldBalances)
    .set({ microUsd: sql`${goldBalances.microUsd} - ${microUsd}` })
    .where(
      and(
        goldBalanceOwnedBy(owner),
        sql`${goldBalances.microUsd} >= ${microUsd}`,
      ),
    )
    .returning({ userId: goldBalances.userId });
  return reserved !== undefined;
}

// Locks owner's balance until tx ends, as reserveGold does, without
// changing it: so work that settles a reservation takes its locks in the
// same order as the work that made it.
async function lockGold(tx: Transaction, owner: UserId): Promise<void> {
  await tx
    .select({ userId: goldBalances.userId })
    .from(goldBalances)
    .where(goldBalanceOwnedBy(owner))
    .for("update");
}

// Adds microUsd, which may be negative, to owner's gold within tx: what
// settling a reservation for its actual cost changes.
async function adjustGold(
  tx: Transaction,
  owner: UserId,
  microUsd: number,
): Promise<void> {
  await tx
    .update(goldBalances)
    .set({ microUsd: sql`${goldBalances.microUsd} + ${microUsd}` })
    .where(goldBalanceOwnedBy(owner));
}

async function transferWithin(
  tx: Transaction,
  payer: UserId,
  { payee, gold, reason, referenceId }: GoldTransfer,
): Promise<GoldTransferResult> {
  if (!Number.isSafeInteger(gold) || gold < 1) {
    throw new RangeError("A transfer moves at least 1 whole gold");
  }
  if (payee === payer) {
    return { kind: "noPayee" };
  }
  await grantMissingStartingGold(tx, [payer, payee]);
  // Both balances locked in one order, so transfers each way between the
  // same two users wait for each other rather than deadlock.
  const rows = await tx
    .select({ userId: goldBalances.userId, microUsd: goldBalances.microUsd })
    .from(goldBalances)
    .where(goldBalancesOfTransfer(payer, payee))
    .orderBy(asc(goldBalances.userId))
    .for("update");
  const payerBalance = rows.find(({ userId }) => userId === payer)?.microUsd;
  if (!rows.some(({ userId }) => userId === payee)) {
    return { kind: "noPayee" };
  }
  const microUsd = goldInMicroUsd(gold);
  if (payerBalance === undefined || payerBalance < microUsd) {
    return { kind: "notEnoughGold", gold: wholeGold(payerBalance ?? 0) };
  }
  await adjustGold(tx, payer, -microUsd);
  await tx
    .update(goldBalances)
    .set({ microUsd: sql`${goldBalances.microUsd} + ${microUsd}` })
    .where(
      and(goldBalancesOfTransfer(payer, payee), eq(goldBalances.userId, payee)),
    );
  const transferId = crypto.randomUUID();
  const reasons = TRANSFER_LEDGER_REASONS[reason];
  await tx.insert(goldLedger).values([
    {
      userId: payer,
      microUsd: -microUsd,
      reason: reasons.payer,
      transferId,
      counterpartyId: payee,
      referenceId,
    },
    {
      userId: payee,
      microUsd,
      reason: reasons.payee,
      transferId,
      counterpartyId: payer,
      referenceId,
    },
  ]);
  return { kind: "moved" };
}

// Moves transfer.gold whole gold from payer, the acting user, to
// transfer.payee, all or nothing: both balances change and the ledger keeps
// both sides, with the reason and reference id, or nothing changes. It
// moves nothing when payer has less than the amount, or there is no one
// else to pay. Concurrent transfers wait for each other on the balances
// they share, so a payer can't spend the same gold twice. It runs in tx
// when given one, such as a purchase's, which then commits or rolls back
// the transfer with the rest of its work; otherwise in a transaction of its
// own. An amount that is not a whole gold of at least 1 throws a
// RangeError and moves nothing.
async function transferGold(
  payer: UserId,
  transfer: GoldTransfer,
  tx?: Transaction,
): Promise<GoldTransferResult> {
  if (tx !== undefined) {
    return await transferWithin(tx, payer, transfer);
  }
  return await withAppErrors("transferGold", () =>
    inTransaction((own) => transferWithin(own, payer, transfer)),
  );
}

// Owner's ledger: every grant and transfer that changed owner's gold,
// oldest first.
async function readGoldLedger(owner: UserId): Promise<GoldLedgerEntry[]> {
  const rows = await withAppErrors("readGoldLedger", () =>
    getDb()
      .select({
        reason: goldLedger.reason,
        microUsd: goldLedger.microUsd,
        counterpartyId: goldLedger.counterpartyId,
        referenceId: goldLedger.referenceId,
        createdAt: goldLedger.createdAt,
      })
      .from(goldLedger)
      .where(goldLedgerOwnedBy(owner))
      .orderBy(asc(goldLedger.createdAt), asc(goldLedger.id)),
  );
  return rows.map((row) => {
    const entry = LEDGER_ROW.parse(row);
    let counterparty: UserId | undefined;
    if (entry.counterpartyId !== null) {
      counterparty = parseUserId(entry.counterpartyId);
    }
    return {
      reason: entry.reason,
      gold: goldOfMicroUsd(entry.microUsd),
      counterparty,
      referenceId: entry.referenceId ?? undefined,
      createdAt: entry.createdAt,
    };
  });
}

export type {
  GoldLedgerEntry,
  GoldLedgerReason,
  GoldTransfer,
  GoldTransferReason,
  GoldTransferResult,
};
export {
  adjustGold,
  chargeGold,
  grantStartingGold,
  lockGold,
  readGoldBalance,
  readGoldLedger,
  reserveGold,
  transferGold,
};
