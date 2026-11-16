// Sign-in link tokens and URLs for the development commands, made as
// src/accounts/emailed-link.ts and src/accounts/sign-in-links.ts make them:
// 32 random bytes in base64url in the URL's token parameter, stored as their
// SHA-256 in hexadecimal. The development commands run under plain Node,
// which can't resolve the site's @/ imports, so this repeats the format, and
// test/component-integration/scripts/development/sign-in-link-token.test.ts
// checks it against the site's.
import { createHash, randomBytes } from "node:crypto";
import { DEVELOPER_EMAIL } from "./environment.ts";

const TOKEN_BYTES = 32;
const SIGN_IN_LINK_PATH = "/login/link";
const EMAIL = /^[^\s@]+@[^\s@]+$/u;

// The address, normalized as the site stores it, or the developer account's
// without one. Throws unless it looks like an email address.
function linkEmail(address: string = DEVELOPER_EMAIL): string {
  const email = address.trim().toLowerCase();
  if (!EMAIL.test(email)) {
    throw new Error(`"${address}" isn't an email address.`);
  }
  return email;
}

function newLinkToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

// The token's SHA-256, in hexadecimal, as login_links stores it.
function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function signInLinkUrl(origin: string, token: string): URL {
  const url = new URL(SIGN_IN_LINK_PATH, origin);
  url.searchParams.set("token", token);
  return url;
}

export { hashLinkToken, linkEmail, newLinkToken, signInLinkUrl };
