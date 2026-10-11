import { constantTimeEqual, hmacSha256 } from "@/auth/hmac.ts";

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const SESSION_MAX_AGE_DAYS = 30;
const BASE64_PADDING = /[=]+$/u;

function isNonEmpty(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}

// Base64url without padding, as Node's digest("base64url") writes it.
function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(BASE64_PADDING, "");
}

async function sign(expiresAtMs: string, secret: string): Promise<string> {
  return toBase64Url(await hmacSha256(secret, expiresAtMs));
}

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS: number =
  SESSION_MAX_AGE_DAYS * SECONDS_PER_DAY;

// A token is `<expiry in ms since epoch>.<HMAC-SHA256 of the expiry>`.
export async function createSessionToken(
  secret: string,
  now: Date,
): Promise<string> {
  const expiresAtMs = String(
    now.getTime() + SESSION_MAX_AGE_SECONDS * MS_PER_SECOND,
  );
  return `${expiresAtMs}.${await sign(expiresAtMs, secret)}`;
}

export async function isValidSessionToken(
  token: string | undefined,
  secret: string,
  now: Date,
): Promise<boolean> {
  const [expiresAtMs, signature, ...rest] = token?.split(".") ?? [];
  if (!(isNonEmpty(expiresAtMs) && isNonEmpty(signature)) || rest.length > 0) {
    return false;
  }
  if (!(await constantTimeEqual(signature, await sign(expiresAtMs, secret)))) {
    return false;
  }
  return Number(expiresAtMs) > now.getTime();
}
