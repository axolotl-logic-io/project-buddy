import { readProductionOrigin } from "@/env.ts";

const TOKEN_BYTES = 32;
const HEXADECIMAL = 16;
const BYTE_HEX_DIGITS = 2;
// A token as tokens are made: 32 bytes in base64url, without padding.
const TOKEN_FORMAT = /^[\w-]{43}$/u;
const BASE64_PADDING = /[=]+$/u;
const ENCODER = new TextEncoder();

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(BASE64_PADDING, "");
}

// The token's SHA-256, in hexadecimal, as login_links stores it.
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", ENCODER.encode(token));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(HEXADECIMAL).padStart(BYTE_HEX_DIGITS, "0"),
  ).join("");
}

// The origin a link leads to: the production domain on Vercel, never the
// request's, which a forged Host header could make another site's; the
// request's own origin elsewhere, such as in local runs and the tests.
function linkOrigin(requestHeaders: Headers): string {
  return (
    readProductionOrigin() ??
    requestHeaders.get("origin") ??
    `http://${requestHeaders.get("host") ?? "localhost"}`
  );
}

export { hashToken, linkOrigin, newToken, TOKEN_FORMAT };
