// Each user's gold (gold.ts), stored in Postgres's gold_balances, and the
// ledger of its grants, gold_ledger. A balance is made with its account,
// holding the starting grant; model calls take their cost from it in place
// (spend-meter.ts). An account that has no balance yet, such as one
// made while the build before gold was live, is given its starting grant
// the first time its balance is read or paid from.

import { and, asc, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  goldBalanceOwnedBy,
  goldLedgerOwnedBy,
} from "@/accounts/owner-scope.ts";
import { type Database, getDb, type Transaction } from "@/db/client.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { users } from "@/db/tables/users.ts";
import { databaseErrorCase } from "@/errors/neon-errors.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { goldInMicroUsd, goldOfMicroUsd, STARTING_GOLD } from "@/gold/gold.ts";
import { parseUserId, type UserId } from "@/ids.ts";

// Why a ledger row changed its user's gold. Only the starting grant is
// written now; the Marketplace reasons are kept for historical rows.
type GoldLedgerReason =
  | "starting-grant"
  | "marketplace-sale"
  | "marketplace-purchase";

// A grant or historical transfer that changed a user's gold, as the ledger keeps it.
interface GoldLedgerEntry {
  readonly reason: GoldLedgerReason;
  // Whole gold: added, or negative when the user paid.
  readonly gold: number;
  // The other user of a historical transfer, while their account exists.
  readonly counterparty: UserId | undefined;
  readonly referenceId: string | undefined;
  readonly createdAt: Date;
}

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

async function selectBalance(
  owner: UserId,
  db: Database | Transaction,
): Promise<number | undefined> {
  const [row] = await db
    .select({ microUsd: goldBalances.microUsd })
    .from(goldBalances)
    .where(goldBalanceOwnedBy(owner));
  return row?.microUsd;
}

// Owner's gold, in micro-USD (gold.ts), which may be slightly below 0. An
// account with no balance yet is given its starting grant first; one that
// no longer exists has none.
async function readGoldBalance(
  owner: UserId,
  db: Database | Transaction = getDb(),
): Promise<number> {
  return await withAppErrors("readGoldBalance", async () => {
    const balance = await selectBalance(owner, db);
    if (balance !== undefined) {
      return balance;
    }
    await grantMissingStartingGold(db, [owner]);
    return (await selectBalance(owner, db)) ?? 0;
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
  owner: UserId,
  microUsd: number,
  tx: Transaction,
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
async function lockGold(owner: UserId, tx: Transaction): Promise<void> {
  await tx
    .select({ userId: goldBalances.userId })
    .from(goldBalances)
    .where(goldBalanceOwnedBy(owner))
    .for("update");
}

// Adds microUsd, which may be negative, to owner's gold within tx: what
// settling a reservation for its actual cost changes.
async function adjustGold(
  owner: UserId,
  microUsd: number,
  tx: Transaction,
): Promise<void> {
  await tx
    .update(goldBalances)
    .set({ microUsd: sql`${goldBalances.microUsd} + ${microUsd}` })
    .where(goldBalanceOwnedBy(owner));
}

// Owner's ledger: every grant and historical transfer that changed owner's gold,
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

export type { GoldLedgerEntry, GoldLedgerReason };
export {
  adjustGold,
  chargeGold,
  grantStartingGold,
  lockGold,
  readGoldBalance,
  readGoldLedger,
  reserveGold,
};
