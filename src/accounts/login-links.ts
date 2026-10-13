// Emailed sign-in links. A link holds a random token, and the login_links
// table holds only the token's SHA-256, so the table alone signs no one in.
// A link signs in any number of times, on any device, until it expires
// LOGIN_LINK_LIFETIME_MINUTES after it was made, or until its user signs
// out everywhere (endEverySession deletes their links).
import { and, eq, gt, lte } from "drizzle-orm";
import { after } from "next/server";
import { countLoginLinkRequest } from "@/accounts/rate-limits.ts";
import {
  findOrCreateUser,
  findUserByEmail,
  normalizeEmail,
  type User,
} from "@/accounts/users-store.ts";
import { clientKeyFromHeaders } from "@/auth/client-key.ts";
import type { SessionUser } from "@/auth/session-token.ts";
import { getDb } from "@/db/client.ts";
import { loginLinks, users } from "@/db/tables/users.ts";
import { EmailFailure, type EmailProblem } from "@/email/email-failure.ts";
import { loginLinkEmail } from "@/email/login-link-email.ts";
import { sendEmail } from "@/email/send-email.ts";
import { readProductionOrigin } from "@/env.ts";
import { AppError } from "@/errors/app-error.ts";
import { logEmailFailure } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserId } from "@/ids.ts";

const MS_PER_MINUTE = 60_000;
const LOGIN_LINK_LIFETIME_MINUTES = 30;
const TOKEN_BYTES = 32;
const HEXADECIMAL = 16;
const BYTE_HEX_DIGITS = 2;
// A token as tokens are made: 32 bytes in base64url, without padding.
const TOKEN_FORMAT = /^[\w-]{43}$/u;
const BASE64_PADDING = /[=]+$/u;
const ENCODER = new TextEncoder();

// A request for a sign-in link, from the sign-in or the sign-up page.
interface LoginLinkRequest {
  // The address as she typed it.
  readonly email: string;
  // Whether to make an account for an address that has none, as signing up
  // does. Otherwise such an address gets no email.
  readonly createAccount: boolean;
  // The request's headers, which name the client and the site's address.
  readonly requestHeaders: Headers;
}

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

// A new link for the user, saved as its token's hash, which works until
// LOGIN_LINK_LIFETIME_MINUTES from now. The user's expired links are
// deleted with it. Returns the token and its hash.
async function createLoginLink(
  userId: SessionUser["id"],
  now: Date,
): Promise<{ token: string; tokenHash: string }> {
  const token = newToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(
    now.getTime() + LOGIN_LINK_LIFETIME_MINUTES * MS_PER_MINUTE,
  );
  const db = getDb();
  await withAppErrors("createLoginLink", () =>
    db.batch([
      db
        .delete(loginLinks)
        .where(
          and(eq(loginLinks.userId, userId), lte(loginLinks.expiresAt, now)),
        ),
      db.insert(loginLinks).values({ tokenHash, userId, expiresAt }),
    ]),
  );
  return { token, tokenHash };
}

// What to log an unsent email as: the email's own problem, or, when the
// database failed before it, retryable if it was unreachable.
function unsentProblem(error: unknown): EmailProblem {
  if (error instanceof EmailFailure) {
    return error.problem;
  }
  if (error instanceof AppError && error.errorCase === "database-unreachable") {
    return "retryable";
  }
  return "our-bug";
}

// The address's account, made now if it has none and createAccount.
function accountFor(
  email: string,
  createAccount: boolean,
): Promise<User | undefined> {
  if (createAccount) {
    return findOrCreateUser(email);
  }
  return findUserByEmail(email);
}

// Emails a new sign-in link to the address's account, making the account
// first if createAccount; an address with no account otherwise gets
// nothing. Runs after the response, so it logs what goes wrong instead of
// throwing.
async function emailLoginLink(
  { email, createAccount }: LoginLinkRequest,
  origin: string,
): Promise<void> {
  try {
    const user = await accountFor(email, createAccount);
    if (user === undefined) {
      return;
    }
    const { token, tokenHash } = await createLoginLink(user.id, new Date());
    const url = new URL("/login/link", origin);
    url.searchParams.set("token", token);
    await sendEmail(
      loginLinkEmail({
        to: user.email,
        url: url.href,
        idempotencyKey: `login-link/${tokenHash}`,
      }),
    );
  } catch (error) {
    logEmailFailure(unsentProblem(error), "send login link", error);
  }
}

// Takes a request for a sign-in link. The request counts against the rate
// limits now, so a storage failure throws its AppError for the form to
// show. Within the limits, the link is made and emailed after the response
// is sent, so the response takes as long whether or not the address has an
// account, and reveals neither that nor the limits.
async function requestLoginLink(request: LoginLinkRequest): Promise<void> {
  const withinLimits = await countLoginLinkRequest(
    normalizeEmail(request.email),
    clientKeyFromHeaders(request.requestHeaders),
    new Date(),
  );
  if (!withinLimits) {
    return;
  }
  const origin = linkOrigin(request.requestHeaders);
  after(() => emailLoginLink(request, origin));
}

// The user the token's link signs in, or undefined if the token is not one
// the site made, or its link has expired or been deleted. Reads nothing for
// a token of the wrong form.
async function readLoginLinkUser(
  token: string,
  now: Date,
): Promise<SessionUser | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const [row] = await withAppErrors("readLoginLinkUser", () =>
    getDb()
      .select({ id: users.id, sessionEpoch: users.sessionEpoch })
      .from(loginLinks)
      .innerJoin(users, eq(users.id, loginLinks.userId))
      .where(
        and(eq(loginLinks.tokenHash, tokenHash), gt(loginLinks.expiresAt, now)),
      ),
  );
  const id = parseUserId(row?.id ?? "");
  if (row === undefined || id === undefined) {
    return undefined;
  }
  return { id, sessionEpoch: row.sessionEpoch };
}

export type { LoginLinkRequest };
export { LOGIN_LINK_LIFETIME_MINUTES, readLoginLinkUser, requestLoginLink };
