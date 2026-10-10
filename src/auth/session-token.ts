import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function sign(expiresAtMs: string, secret: string): string {
  return createHmac("sha256", secret).update(expiresAtMs).digest("base64url");
}

// A token is `<expiry in ms since epoch>.<HMAC-SHA256 of the expiry>`.
export function createSessionToken(secret: string, now: Date): string {
  const expiresAtMs = String(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAtMs}.${sign(expiresAtMs, secret)}`;
}

export function isValidSessionToken(
  token: string | undefined,
  secret: string,
  now: Date,
): boolean {
  const [expiresAtMs, signature, ...rest] = token?.split(".") ?? [];
  if (!expiresAtMs || !signature || rest.length > 0) {
    return false;
  }
  const expected = Buffer.from(sign(expiresAtMs, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return false;
  }
  return Number(expiresAtMs) > now.getTime();
}
