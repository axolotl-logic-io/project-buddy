import { sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeEmail } from "@/accounts/users-store.ts";
import { hmacSha256 } from "@/auth/hmac.ts";
import { inTransaction } from "@/db/client.ts";
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

// The prefixes of the senders' budget keys and the recipients' cooldown
// keys, and the label that sets the recipient HMAC apart from other uses of
// the session secret.
const SENDER_PREFIX = "invitation-admin:";
const RECIPIENT_PREFIX = "invitation-recipient:";
const RECIPIENT_LABEL = "project-buddy invitation recipient\n";

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
  sender: UserId,
  email: string,
): Promise<Reservation | undefined> {
  const now = new Date(Date.now());
  const digest = await hmacSha256(
    readSessionSecret(),
    `${RECIPIENT_LABEL}${normalizeEmail(email)}`,
  );
  const recipientKey = `${RECIPIENT_PREFIX}${Buffer.from(digest).toString("hex")}`;
  const budgetKey = `${SENDER_PREFIX}${sender}`;
  const cutoff = new Date(now.getTime() - HOUR_MS).toISOString();
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS).toISOString();
  const timestamp = now.toISOString();
  const result = await withAppErrors("reserve invitation send", () =>
    inTransaction(async (tx) => {
      // This row lock serializes reservations and refunds for the sender. The
      // next statement gets a fresh READ COMMITTED snapshot after the wait.
      await tx.execute(sql`
        insert into rate_limits (key, count, window_started_at)
        values (${budgetKey}, 0, ${timestamp}::timestamptz)
        on conflict (key) do update set
          count = case when rate_limits.window_started_at <= ${cutoff}::timestamptz then 0 else rate_limits.count end,
          window_started_at = case when rate_limits.window_started_at <= ${cutoff}::timestamptz then ${timestamp}::timestamptz else rate_limits.window_started_at end
      `);
      const reserved = await tx.execute(sql`
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
      `);
      await tx.execute(sql`
        delete from rate_limits where key in (
          select key from rate_limits
          where (starts_with(key, ${SENDER_PREFIX}) or starts_with(key, ${RECIPIENT_PREFIX}))
            and window_started_at <= ${cutoff}::timestamptz
          limit ${EXPIRED_ROWS_PER_SEND} for update skip locked
        )
      `);
      return reserved;
    }),
  );
  const [reservation] = RESERVED.parse(result).rows;
  if (reservation === undefined) {
    return undefined;
  }
  const windowStartedAt = reservation.windowStartedAt.toISOString();
  async function release(): Promise<void> {
    await withAppErrors("release failed invitation send", () =>
      inTransaction(async (tx) => {
        await tx.execute(sql`
          update rate_limits set count = greatest(0, count - 1)
          where key = ${budgetKey}
            and window_started_at = ${windowStartedAt}::timestamptz
        `);
        await tx.execute(sql`
          delete from rate_limits where key = ${recipientKey}
            and window_started_at = ${timestamp}::timestamptz
        `);
      }),
    );
  }
  return { release };
}

// Sends an admin's invitation within the admin's invitation limits, answering
// whether it was within them. Both new and existing accounts use these limits,
// independently of public sign-in requests. A failed
// send releases the reservation so the admin can retry immediately. In-flight
// sends count toward both limits.
async function sendWithinInvitationLimits(
  admin: UserId,
  email: string,
  send: () => Promise<void>,
): Promise<boolean> {
  const reservation = await reserve(admin, email);
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

export { sendWithinInvitationLimits };
