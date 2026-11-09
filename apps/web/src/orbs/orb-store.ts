// Orbs belong to the acting user. Grants are idempotent; transfers lock both
// balances in user-id order and record both ledger sides in the purchase transaction.
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  orbBalanceOwnedBy,
  orbBalancesOfTransfer,
  orbLedgerOwnedBy,
} from "@/accounts/owner-scope.ts";
import {
  type Database,
  getDb,
  inTransaction,
  type Transaction,
} from "@/db/client.ts";
import { orbBalances, orbLedger } from "@/db/tables/orbs.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserId, type UserId } from "@/ids.ts";

type OrbsTransferReason = "marketplace-sale";

interface OrbsTransfer {
  readonly payee: UserId;
  readonly orbs: number;
  readonly reason: OrbsTransferReason;
  readonly referenceId: string;
}

type OrbsTransferResult =
  | { readonly kind: "moved" }
  | { readonly kind: "alreadyMoved" }
  | { readonly kind: "notEnoughOrbs"; readonly orbs: number }
  | { readonly kind: "noPayee" };

type OrbsLedgerReason =
  | "starting-grant"
  | "marketplace-sale"
  | "marketplace-purchase";

interface OrbsLedgerEntry {
  readonly reason: OrbsLedgerReason;
  readonly orbs: number;
  readonly counterparty: UserId | undefined;
  readonly referenceId: string | undefined;
  readonly createdAt: Date;
}

const TRANSFER_LEDGER_REASONS: Readonly<
  Record<
    OrbsTransferReason,
    { readonly payer: OrbsLedgerReason; readonly payee: OrbsLedgerReason }
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
  orbs: z.number(),
  counterpartyId: z.string().nullable(),
  referenceId: z.string().nullable(),
  createdAt: z.date(),
});

async function grantMissingStartingOrbs(
  db: Database | Transaction,
  accounts: readonly UserId[],
): Promise<void> {
  const orbs = 100;
  await db.execute(sql`
    with granted as (
      insert into orb_balances (user_id, orbs)
      select id, ${orbs} from ${users} where ${inArray(users.id, [...accounts])} order by id
      on conflict do nothing
      returning user_id
    )
    insert into orb_ledger (user_id, orbs, reason)
    select user_id, ${orbs}, 'starting-grant' from granted
    on conflict do nothing
  `);
}

// Provisions an existing account once, preserving a balance changed by trades.
async function grantStartingOrbs(owner: UserId): Promise<void> {
  await withAppErrors("grant starting orbs", () =>
    grantMissingStartingOrbs(getDb(), [owner]),
  );
}

async function selectBalance(
  owner: UserId,
  db: Database | Transaction,
): Promise<number | undefined> {
  const [row] = await db
    .select({ orbs: orbBalances.orbs })
    .from(orbBalances)
    .where(orbBalanceOwnedBy(owner));
  return row?.orbs;
}

// Reads only the acting user’s balance; provisions a missing grant atomically.
async function readOrbsBalance(
  owner: UserId,
  db: Database | Transaction = getDb(),
): Promise<number> {
  return await withAppErrors("read orb balance", async () => {
    const balance = await selectBalance(owner, db);
    if (balance !== undefined) {
      return balance;
    }
    await grantMissingStartingOrbs(db, [owner]);
    return (await selectBalance(owner, db)) ?? 0;
  });
}

async function alreadyTransferred(
  payer: UserId,
  reason: OrbsLedgerReason,
  referenceId: string,
  tx: Transaction,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: orbLedger.id })
    .from(orbLedger)
    .where(
      and(
        orbLedgerOwnedBy(payer),
        eq(orbLedger.reason, reason),
        eq(orbLedger.referenceId, referenceId),
      ),
    );
  return row !== undefined;
}

async function transferWithin(
  payer: UserId,
  { payee, orbs, reason, referenceId }: OrbsTransfer,
  tx: Transaction,
): Promise<OrbsTransferResult> {
  if (!Number.isSafeInteger(orbs) || orbs < 1) {
    throw new RangeError("A transfer moves at least 1 whole orbs");
  }
  if (payee === payer) {
    return { kind: "noPayee" };
  }
  await grantMissingStartingOrbs(tx, [payer, payee]);
  const rows = await tx
    .select({ userId: orbBalances.userId, orbs: orbBalances.orbs })
    .from(orbBalances)
    .where(orbBalancesOfTransfer(payer, payee))
    .orderBy(asc(orbBalances.userId))
    .for("update");
  const reasons = TRANSFER_LEDGER_REASONS[reason];
  if (await alreadyTransferred(payer, reasons.payer, referenceId, tx)) {
    return { kind: "alreadyMoved" };
  }
  const payerBalance = rows.find(({ userId }) => userId === payer)?.orbs;
  if (!rows.some(({ userId }) => userId === payee)) {
    return { kind: "noPayee" };
  }
  if (payerBalance === undefined || payerBalance < orbs) {
    return { kind: "notEnoughOrbs", orbs: payerBalance ?? 0 };
  }
  await tx
    .update(orbBalances)
    .set({ orbs: sql`${orbBalances.orbs} - ${orbs}` })
    .where(orbBalanceOwnedBy(payer));
  await tx
    .update(orbBalances)
    .set({ orbs: sql`${orbBalances.orbs} + ${orbs}` })
    .where(
      and(orbBalancesOfTransfer(payer, payee), eq(orbBalances.userId, payee)),
    );
  const transferId = crypto.randomUUID();
  await tx.insert(orbLedger).values([
    {
      userId: payer,
      orbs: -orbs,
      reason: reasons.payer,
      transferId,
      counterpartyId: payee,
      referenceId,
    },
    {
      userId: payee,
      orbs,
      reason: reasons.payee,
      transferId,
      counterpartyId: payer,
      referenceId,
    },
  ]);
  return { kind: "moved" };
}

// Moves whole orbs once per payer and reference, with both ledger sides.
// A supplied transaction makes the payment atomic with saving a bought copy.
async function transferOrbs(
  payer: UserId,
  transfer: OrbsTransfer,
  tx?: Transaction,
): Promise<OrbsTransferResult> {
  if (tx !== undefined) {
    return await transferWithin(payer, transfer, tx);
  }
  return await withAppErrors("transfer orbs", () =>
    inTransaction((own) => transferWithin(payer, transfer, own)),
  );
}

// Reads the acting user’s grants and trades, oldest first.
async function readOrbsLedger(owner: UserId): Promise<OrbsLedgerEntry[]> {
  const rows = await withAppErrors("read orb ledger", () =>
    getDb()
      .select({
        reason: orbLedger.reason,
        orbs: orbLedger.orbs,
        counterpartyId: orbLedger.counterpartyId,
        referenceId: orbLedger.referenceId,
        createdAt: orbLedger.createdAt,
      })
      .from(orbLedger)
      .where(orbLedgerOwnedBy(owner))
      .orderBy(asc(orbLedger.createdAt), asc(orbLedger.id)),
  );
  return rows.map((row) => {
    const entry = LEDGER_ROW.parse(row);
    let counterparty: UserId | undefined;
    if (entry.counterpartyId !== null) {
      counterparty = parseUserId(entry.counterpartyId);
    }
    return {
      reason: entry.reason,
      orbs: entry.orbs,
      counterparty,
      referenceId: entry.referenceId ?? undefined,
      createdAt: entry.createdAt,
    };
  });
}

export { grantStartingOrbs, readOrbsBalance, readOrbsLedger, transferOrbs };
