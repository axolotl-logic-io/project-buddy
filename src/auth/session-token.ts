// Session tokens, the session cookie's value. A token names its user and the
// user's session epoch when it was signed, and expires after
// SESSION_MAX_AGE_SECONDS. The proxy checks only its signature and expiry;
// src/auth/current-user.ts also checks that the epoch is still the user's,
// so a raised epoch signs every earlier session out.
import { constantTimeEqual, hmacSha256 } from "@/auth/hmac.ts";
import { parseUserId, type UserId } from "@/ids.ts";

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const SESSION_MAX_AGE_DAYS = 30;
const BASE64_PADDING = /[=]+$/u;
// An epoch or an expiry as a token writes it: digits, without a sign.
const DIGITS = /^\d+$/u;

// Whose session a token is, and at which of the user's session epochs.
interface SessionUser {
  readonly id: UserId;
  readonly sessionEpoch: number;
}

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

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS: number = SESSION_MAX_AGE_DAYS * SECONDS_PER_DAY;

// Base64url without padding, as Node's digest("base64url") writes it.
function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(BASE64_PADDING, "");
}

async function sign(claims: string, secret: string): Promise<string> {
  return toBase64Url(await hmacSha256(secret, claims));
}

// The value as a whole number a token can hold, or undefined.
function parseDigits(value: string): number | undefined {
  if (!DIGITS.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return undefined;
  }
  return parsed;
}

// A token is `<user id>.<session epoch>.<expiry in ms since the Unix
// epoch>.<HMAC-SHA256 of the three before it, dot-joined, in base64url>`.
async function createSessionToken(
  user: SessionUser,
  secret: string,
  now: Date,
): Promise<string> {
  const expiresAtMs = now.getTime() + SESSION_MAX_AGE_SECONDS * MS_PER_SECOND;
  const claims = `${user.id}.${user.sessionEpoch}.${expiresAtMs}`;
  return `${claims}.${await sign(claims, secret)}`;
}

// The user and epoch the token names, or undefined unless the token is well
// formed, signed with secret and unexpired at now.
async function readSessionToken(
  token: string | undefined,
  secret: string,
  now: Date,
): Promise<SessionUser | undefined> {
  const [userId = "", epoch = "", expiresAtMs = "", signature = "", ...rest] =
    token?.split(".") ?? [];
  const id = parseUserId(userId);
  const sessionEpoch = parseDigits(epoch);
  const expiry = parseDigits(expiresAtMs);
  if (
    id === undefined ||
    sessionEpoch === undefined ||
    expiry === undefined ||
    signature === "" ||
    rest.length > 0
  ) {
    return undefined;
  }
  const expected = await sign(`${userId}.${epoch}.${expiresAtMs}`, secret);
  if (!(await constantTimeEqual(signature, expected))) {
    return undefined;
  }
  if (expiry <= now.getTime()) {
    return undefined;
  }
  return { id, sessionEpoch };
}

// The cookie that signs user in from now, for SESSION_MAX_AGE_SECONDS.
async function sessionCookie(
  user: SessionUser,
  secret: string,
  now: Date,
): Promise<SessionCookie> {
  return {
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(user, secret, now),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export type { SessionCookie, SessionUser };
export {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
};
