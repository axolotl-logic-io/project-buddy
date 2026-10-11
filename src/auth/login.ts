// The login policy: a client that has failed too often is locked out, a wrong
// passphrase counts against the client, and the right one clears its count
// and opens a session.
import {
  clearFailedLogins,
  clientKeyFromHeaders,
  isLockedOut,
  readFailedLogins,
  recordFailedLogin,
} from "@/auth/failed-logins.ts";
import { constantTimeEqual } from "@/auth/hmac.ts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token.ts";
import { getDb } from "@/db/client.ts";
import { readSessionSecret, readSitePassphrase } from "@/env.ts";

// The cookie that carries a session, ready for Next's `cookies().set`.
interface SessionCookie {
  readonly name: typeof SESSION_COOKIE_NAME;
  readonly value: string;
  readonly httpOnly: true;
  readonly secure: true;
  readonly sameSite: "lax";
  readonly path: "/";
  readonly maxAge: number;
}

interface LoginAttempt {
  readonly passphrase: string;
  // The login request's headers, which identify the client.
  readonly requestHeaders: Headers;
}

type LoginResult =
  | { readonly kind: "signed-in"; readonly sessionCookie: SessionCookie }
  | { readonly kind: "locked-out" }
  | { readonly kind: "wrong-passphrase" };

async function sessionCookie(now: Date): Promise<SessionCookie> {
  return {
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(readSessionSecret(), now),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

// Checks the passphrase against SITE_PASSPHRASE, keeping the client's
// failed-login count, and returns the session cookie to set on success.
async function attemptLogin({
  passphrase,
  requestHeaders,
}: LoginAttempt): Promise<LoginResult> {
  const db = getDb();
  const clientKey = clientKeyFromHeaders(requestHeaders);
  const now = new Date();

  if (isLockedOut(await readFailedLogins(db, clientKey), now)) {
    return { kind: "locked-out" };
  }
  if (!(await constantTimeEqual(passphrase, readSitePassphrase()))) {
    await recordFailedLogin(db, clientKey, now);
    return { kind: "wrong-passphrase" };
  }
  await clearFailedLogins(db, clientKey);
  return { kind: "signed-in", sessionCookie: await sessionCookie(now) };
}

export type { LoginResult };
export { attemptLogin };
