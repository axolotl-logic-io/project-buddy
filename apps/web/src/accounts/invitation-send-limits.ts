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

// Reserves one of this admin's 20 sends per hour and the recipient's one-minute
// cooldown before calling send. Both new and existing accounts use these limits,
// independently of public sign-in requests. Failed sends release the reservation
// so the admin can retry immediately. In-flight sends count toward both limits.
async function sendWithinInvitationLimits(
  admin: UserId,
  email: string,
  send: () => Promise<void>,
): Promise<boolean> {
  const now = new Date(Date.now());
  const digest = await hmacSha256(
    readSessionSecret(),
    `project-buddy invitation recipient\n${normalizeEmail(email)}`,
  );
  const recipientKey = `invitation-recipient:${Buffer.from(digest).toString("hex")}`;
  const budgetKey = `invitation-admin:${admin}`;
  const cutoff = new Date(now.getTime() - HOUR_MS).toISOString();
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS).toISOString();
  const timestamp = now.toISOString();
  const db = getDb();
  const [, result] = await withAppErrors("reserve invitation send", () =>
    db.batch([
      // This row lock serializes reservations and refunds for the admin. The
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
          where (starts_with(key, 'invitation-admin:') or starts_with(key, 'invitation-recipient:'))
            and window_started_at <= ${cutoff}::timestamptz
          limit ${EXPIRED_ROWS_PER_SEND} for update skip locked
        )
      `),
    ]),
  );
  const [reservation] = RESERVED.parse(result).rows;
  if (reservation === undefined) {
    return false;
  }
  try {
    await send();
  } catch (error) {
    await withAppErrors("release failed invitation send", () =>
      db.batch([
        db.execute(sql`
          update rate_limits set count = greatest(0, count - 1)
          where key = ${budgetKey}
            and window_started_at = ${reservation.windowStartedAt.toISOString()}::timestamptz
        `),
        db.execute(sql`
          delete from rate_limits where key = ${recipientKey}
            and window_started_at = ${timestamp}::timestamptz
        `),
      ]),
    );
    throw error;
  }
  return true;
}

export { sendWithinInvitationLimits };
