import { constantTimeEqual } from "@/auth/constant-time.ts";

const ENCODER = new TextEncoder();
const HMAC_SHA256: HmacImportParams = { name: "HMAC", hash: "SHA-256" };
const MS_PER_SECOND = 1000;
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
  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    HMAC_SHA256,
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    HMAC_SHA256.name,
    key,
    ENCODER.encode(expiresAtMs),
  );
  return toBase64Url(signature);
}

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

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
