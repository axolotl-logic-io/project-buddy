import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  hashToken,
  linkOrigin,
  newToken,
  TOKEN_FORMAT,
} from "@/accounts/emailed-link.ts";
import {
  LOGIN_LINK_LIFETIME_MINUTES,
  sendLoginLink,
} from "@/accounts/login-links.ts";
import { findUserByEmail, normalizeEmail } from "@/accounts/users-store.ts";
import type { SessionUser } from "@/auth/session-token.ts";
import { getDb } from "@/db/client.ts";
import { activeInvitations, invitations } from "@/db/tables/invitations.ts";
import { invitationEmail } from "@/email/invitation-email.ts";
import { sendEmail } from "@/email/send-email.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserId } from "@/ids.ts";

const MS_PER_MINUTE = 60_000;
const ACCEPTED_ROWS = z.object({
  rows: z.array(
    z.object({ id: z.string().uuid(), sessionEpoch: z.number().int() }),
  ),
});

// Sends an invitation, or a normal sign-in link for an existing account.
// A failed delivery never replaces the previous usable invitation. The caller
// must authorize the admin, validate the address and apply invitation send
// limits before calling.
async function sendInvitation(
  email: string,
  requestHeaders: Headers,
): Promise<void> {
  const normalized = normalizeEmail(email);
  const origin = linkOrigin(requestHeaders);
  const existing = await findUserByEmail(normalized);
  if (existing !== undefined) {
    await sendLoginLink(existing, origin);
    return;
  }
  const token = newToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(
    Date.now() + LOGIN_LINK_LIFETIME_MINUTES * MS_PER_MINUTE,
  );
  await withAppErrors("save invitation", () =>
    getDb()
      .insert(invitations)
      .values({ email: normalized, tokenHash, expiresAt }),
  );
  const url = new URL("/setup", origin);
  url.searchParams.set("token", token);
  await sendEmail(
    invitationEmail({
      to: normalized,
      url: url.href,
      idempotencyKey: `invitation/${tokenHash}`,
    }),
  );
  await withAppErrors("activate invitation", () =>
    getDb()
      .insert(activeInvitations)
      .values({ email: normalized, tokenHash })
      .onConflictDoUpdate({
        target: activeInvitations.email,
        set: { tokenHash },
      }),
  );
}

// Looking at a link is read-only, including when a mail scanner opens it.
async function readInvitation(
  token: string,
  now: Date,
): Promise<string | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const [row] = await withAppErrors("read invitation", () =>
    getDb()
      .select({ email: invitations.email })
      .from(invitations)
      .innerJoin(
        activeInvitations,
        and(
          eq(activeInvitations.tokenHash, invitations.tokenHash),
          eq(activeInvitations.email, invitations.email),
        ),
      )
      .where(
        and(
          eq(invitations.tokenHash, tokenHash),
          gt(invitations.expiresAt, now),
        ),
      ),
  );
  return row?.email;
}

// Atomically claims a valid link and creates its ordinary account. DELETE
// locks the one active row: concurrent confirmations cannot both return it.
// The insert and consumption roll back together on a storage failure. No
// recipient field is accepted; only the stored address can get an account.
async function acceptInvitation(
  token: string,
  now: Date,
): Promise<SessionUser | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const result = await withAppErrors("accept invitation", () =>
    getDb().execute(sql`
    with claimed as (
      delete from active_invitations a using invitations i
      where a.token_hash = ${tokenHash} and i.token_hash = a.token_hash
        and i.email = a.email and i.expires_at > ${now.toISOString()}::timestamptz
      returning a.email
    )
    insert into users (email) select email from claimed
    on conflict (email) do nothing
    returning id, session_epoch as "sessionEpoch"
  `),
  );
  const [row] = ACCEPTED_ROWS.parse(result).rows;
  if (row === undefined) {
    return undefined;
  }
  const id = parseUserId(row.id);
  if (id === undefined) {
    return undefined;
  }
  return { id, sessionEpoch: row.sessionEpoch };
}

export { acceptInvitation, readInvitation, sendInvitation };
