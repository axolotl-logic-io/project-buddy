import { sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeEmail } from "@/accounts/users-store.ts";
import { hmacSha256 } from "@/auth/hmac.ts";
import { getDb } from "@/db/client.ts";
import { readSessionSecret } from "@/env.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";

const BUDGET = 20;
const HOUR_MS = 3_600_000;
const COOLDOWN_MS = 60_000;
const EXPIRED_ROWS_PER_SEND = 100;
const RESERVED = z.object({
  rows: z.array(z.object({ windowStartedAt: z.coerce.date() })),
});

// One kind of invitation's limits: the prefixes of its senders' budget keys
// and its recipients' cooldown keys, and the label that sets its recipient
// HMAC apart. Each kind counts apart from the others.
interface SendLimits {
  readonly senderPrefix: string;
  readonly recipientPrefix: string;
  readonly recipientLabel: string;
}

const INVITATION_LIMITS: SendLimits = {
  senderPrefix: "invitation-admin:",
  recipientPrefix: "invitation-recipient:",
  recipientLabel: "project-buddy invitation recipient\n",
};

const PROJECT_INVITATION_LIMITS: SendLimits = {
  senderPrefix: "project-invitation-inviter:",
  recipientPrefix: "project-invitation-recipient:",
  recipientLabel: "project-buddy project invitation recipient\n",
};

// A send reserved within the limits. release gives it back, the sender's
// send and the recipient's cooldown, so the sender can retry immediately.
interface Reservation {
  readonly release: () => Promise<void>;
}

// Reserves one of the sender's 20 sends per hour and the recipient's one-minute
// cooldown, and gives the way to release them, or undefined, reserving
// nothing, if either limit is reached. A reservation not released counts
// toward both limits.
async function reserve(
  limits: SendLimits,
  sender: UserId,
  email: string,
): Promise<Reservation | undefined> {
  const now = new Date(Date.now());
  const digest = await hmacSha256(
    readSessionSecret(),
    `${limits.recipientLabel}${normalizeEmail(email)}`,
  );
  const recipientKey = `${limits.recipientPrefix}${Buffer.from(digest).toString("hex")}`;
  const budgetKey = `${limits.senderPrefix}${sender}`;
  const cutoff = new Date(now.getTime() - HOUR_MS).toISOString();
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS).toISOString();
  const timestamp = now.toISOString();
  const db = getDb();
  const [, result] = await withAppErrors("reserve invitation send", () =>
    db.batch([
      // This row lock serializes reservations and refunds for the sender. The
      // next statement gets a fresh READ COMMITTED snapshot after the wait.
      db.execute(sql`
        insert into rate_limits (key, count, window_started_at)
        values (${budgetKey}, 0, ${timestamp}::timestamptz)
        on conflict (key) do update set
          count = case when rate_limits.window_started_at <= ${cutoff}::timestamptz then 0 else rate_limits.count end,
          window_started_at = case when rate_limits.window_started_at <= ${cutoff}::timestamptz then ${timestamp}::timestamptz else rate_limits.window_started_at end
      `),
      db.execute(sql`
        with recipient as (
          insert into rate_limits (key, count, window_started_at)
          select ${recipientKey}, 1, ${timestamp}::timestamptz
          where exists (select 1 from rate_limits where key = ${budgetKey} and count < ${BUDGET})
          on conflict (key) do update set count = 1, window_started_at = excluded.window_started_at
          where rate_limits.window_started_at <= ${cooldownCutoff}::timestamptz
          returning key
        )
        update rate_limits set count = count + 1
        where key = ${budgetKey} and exists (select 1 from recipient)
        returning window_started_at as "windowStartedAt"
      `),
      db.execute(sql`
        delete from rate_limits where key in (
          select key from rate_limits
          where (starts_with(key, ${limits.senderPrefix}) or starts_with(key, ${limits.recipientPrefix}))
            and window_started_at <= ${cutoff}::timestamptz
          limit ${EXPIRED_ROWS_PER_SEND} for update skip locked
        )
      `),
    ]),
  );
  const [reservation] = RESERVED.parse(result).rows;
  if (reservation === undefined) {
    return undefined;
  }
  const windowStartedAt = reservation.windowStartedAt.toISOString();
  async function release(): Promise<void> {
    await withAppErrors("release failed invitation send", () =>
      db.batch([
        db.execute(sql`
          update rate_limits set count = greatest(0, count - 1)
          where key = ${budgetKey}
            and window_started_at = ${windowStartedAt}::timestamptz
        `),
        db.execute(sql`
          delete from rate_limits where key = ${recipientKey}
            and window_started_at = ${timestamp}::timestamptz
        `),
      ]),
    );
  }
  return { release };
}

// Sends an admin's invitation within the admin's invitation limits, answering
// whether it was within them. Both new and existing accounts use these limits,
// independently of public sign-in requests and project invitations. A failed
// send releases the reservation so the admin can retry immediately. In-flight
// sends count toward both limits.
async function sendWithinInvitationLimits(
  admin: UserId,
  email: string,
  send: () => Promise<void>,
): Promise<boolean> {
  const reservation = await reserve(INVITATION_LIMITS, admin, email);
  if (reservation === undefined) {
    return false;
  }
  try {
    await send();
  } catch (error) {
    await reservation.release();
    throw error;
  }
  return true;
}

// Reserves a project invitation within the inviter's project invitation
// limits, the same as an admin's but counted apart: 20 per inviter per hour,
// and one a minute to each address. Every attempt to an address counts the
// same, whether or not it has an account, so the limits reveal nothing.
// Gives the reservation, to release if sending fails, or undefined,
// reserving nothing, past the limits.
function reserveProjectInvitation(
  inviter: UserId,
  email: string,
): Promise<Reservation | undefined> {
  return reserve(PROJECT_INVITATION_LIMITS, inviter, email);
}

export type { Reservation };
export { reserveProjectInvitation, sendWithinInvitationLimits };
