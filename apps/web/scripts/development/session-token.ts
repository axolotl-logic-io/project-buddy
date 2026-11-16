// Signs and reads the site's session tokens for the development commands, in
// the format src/auth/session-token.ts defines: `<user id>.<session epoch>.
// <expiry in ms since the Unix epoch>.<HMAC-SHA256 of the three, dot-joined,
// in base64url>`. The development commands run under plain Node, which can't
// resolve the site's @/ imports, so this repeats the format, and
// test/component-integration/scripts/development/session-token.test.ts
// checks that the site accepts these tokens.
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

const MS_PER_DAY = 86_400_000;
const SESSION_MAX_AGE_DAYS = 30;
const TOKEN_PARTS = 4;

// Whose session a token is, at which session epoch, until when.
interface SessionClaims {
  readonly id: string;
  readonly sessionEpoch: number;
  readonly expiresAtMs: number;
}

function signatureOf(claims: string, secret: string): string {
  return createHmac("sha256", secret).update(claims).digest("base64url");
}

// A token for the user at the epoch, valid for as long as a site session.
function createSessionToken(
  user: { readonly id: string; readonly sessionEpoch: number },
  secret: string,
  now: Date,
): string {
  const expiresAtMs = now.getTime() + SESSION_MAX_AGE_DAYS * MS_PER_DAY;
  const claims = `${user.id}.${user.sessionEpoch}.${expiresAtMs}`;
  return `${claims}.${signatureOf(claims, secret)}`;
}

// The claims of a token signed with the secret, or undefined. It doesn't
// check the expiry: the caller decides how much time must be left.
function readSessionToken(
  token: string,
  secret: string,
): SessionClaims | undefined {
  const parts = token.split(".");
  const [id = "", epoch = "", expiry = "", signature = ""] = parts;
  if (parts.length !== TOKEN_PARTS) {
    return undefined;
  }
  const expected = Buffer.from(signatureOf(`${id}.${epoch}.${expiry}`, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return undefined;
  }
  return { id, sessionEpoch: Number(epoch), expiresAtMs: Number(expiry) };
}

export type { SessionClaims };
export { createSessionToken, MS_PER_DAY, readSessionToken };
