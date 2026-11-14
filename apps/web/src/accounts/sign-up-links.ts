import { and, eq, gt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { hashToken, newToken, TOKEN_FORMAT } from "@/accounts/emailed-link.ts";
import { checkUserName } from "@/accounts/user-name.ts";
import { normalizeEmail } from "@/accounts/users-store.ts";
import type { SessionUser } from "@/auth/session-token.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { signUpLinks } from "@/db/tables/sign-up-links.ts";
import { sendEmail } from "@/email/send-email.ts";
import { signInLinkEmail } from "@/email/sign-in-link-email.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserId } from "@/ids.ts";
import { SIGN_IN_LINK_PATH } from "@/routes.ts";

const LINK_LIFETIME_MINUTES = 30;
const MS_PER_MINUTE = 60_000;
const LINK_LIFETIME_MS: number = LINK_LIFETIME_MINUTES * MS_PER_MINUTE;
const CONFIRMED = z.object({
  rows: z.array(
    z.object({
      id: z.string().uuid(),
      sessionEpoch: z.number().int(),
    }),
  ),
});

// Sends verification without creating an account. Both public forms use the
// sign-in request limiter before this operation is scheduled.
async function sendSignUpLink(email: string, origin: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const token = newToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LINK_LIFETIME_MS);
  await withAppErrors("save sign-up link", () =>
    inTransaction(async (tx) => {
      await tx.delete(signUpLinks).where(lte(signUpLinks.expiresAt, now));
      await tx
        .insert(signUpLinks)
        .values({ email: normalized, tokenHash, expiresAt })
        .onConflictDoUpdate({
          target: signUpLinks.email,
          set: { tokenHash, expiresAt },
        });
    }),
  );
  const url = new URL(SIGN_IN_LINK_PATH, origin);
  url.searchParams.set("token", token);
  await sendEmail(
    signInLinkEmail({
      to: normalized,
      url: url.href,
      idempotencyKey: `signup-link/${tokenHash}`,
    }),
  );
}

// Opening a verification link is read-only, so mail scanners create nothing.
async function readSignUpEmail(
  token: string,
  now: Date,
): Promise<string | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const [row] = await withAppErrors("read sign-up link", () =>
    getDb()
      .select({ email: signUpLinks.email })
      .from(signUpLinks)
      .where(
        and(
          eq(signUpLinks.tokenHash, tokenHash),
          gt(signUpLinks.expiresAt, now),
        ),
      ),
  );
  return row?.email;
}

// Validates the required name, claims verification and creates or returns the address's ordinary account
// atomically. A failed insert preserves the link. Concurrent confirmations
// cannot consume the same link twice or create duplicate accounts.
async function confirmSignUp(
  token: string,
  now: Date,
  name: string,
): Promise<SessionUser | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const checked = checkUserName(name);
  if (checked.kind !== "valid") {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const result = await withAppErrors("confirm sign-up", () =>
    getDb().execute(sql`
    with claimed as (
      delete from signup_links where token_hash = ${tokenHash} and expires_at > ${now.toISOString()}::timestamptz
      returning email
    )
    insert into users (email, name) select email, ${checked.name} from claimed
    on conflict (email) do update set email = excluded.email
    returning id, session_epoch as "sessionEpoch"
  `),
  );
  const [row] = CONFIRMED.parse(result).rows;
  const id = parseUserId(row?.id ?? "");
  if (row === undefined || id === undefined) {
    return undefined;
  }
  return {
    id,
    sessionEpoch: row.sessionEpoch,
  };
}

export { confirmSignUp, readSignUpEmail, sendSignUpLink };
