// Emailed sign-in links. A link holds a random token, and the login_links
// table holds only the token's SHA-256, so the table alone signs no one in.
// A link signs in any number of times, on any device, until it expires
// LOGIN_LINK_LIFETIME_MINUTES after it was made, or until its user signs
// out everywhere (endEverySession deletes their links).
import { and, eq, gt, lte } from "drizzle-orm";
import { after } from "next/server";
import {
  hashToken,
  linkOrigin,
  newToken,
  TOKEN_FORMAT,
} from "@/accounts/emailed-link.ts";
import { countLoginLinkRequest } from "@/accounts/rate-limits.ts";
import {
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
import { AppError } from "@/errors/app-error.ts";
import { logEmailFailure } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserId } from "@/ids.ts";

const MS_PER_MINUTE = 60_000;
const LOGIN_LINK_LIFETIME_MINUTES = 30;
interface LoginLinkRequest {
  readonly email: string;
  readonly requestHeaders: Headers;
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

// Sends a normal, reusable login link, reporting delivery failures to the caller.
async function sendLoginLink(user: User, origin: string): Promise<void> {
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
}

// Public sign-in deliberately reports no delivery or account information.
async function emailLoginLink(
  request: LoginLinkRequest,
  origin: string,
): Promise<void> {
  try {
    const user = await findUserByEmail(request.email);
    if (user !== undefined) {
      await sendLoginLink(user, origin);
    }
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

// The user a login link signs in, with the extras her account hides, read
// in the same query so signing in needn't read her again to seed them.
interface LoginLinkUser {
  readonly user: SessionUser;
  readonly hiddenExtras: readonly string[];
}

// The user the token's link signs in, with her hidden extras, or undefined
// if the token is not one the site made, or its link has expired or been
// deleted. Reads nothing for a token of the wrong form.
async function readLoginLinkUser(
  token: string,
  now: Date,
): Promise<LoginLinkUser | undefined> {
  if (!TOKEN_FORMAT.test(token)) {
    return undefined;
  }
  const tokenHash = await hashToken(token);
  const [row] = await withAppErrors("readLoginLinkUser", () =>
    getDb()
      .select({
        id: users.id,
        sessionEpoch: users.sessionEpoch,
        hiddenExtras: users.hiddenExtras,
      })
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
  return {
    user: { id, sessionEpoch: row.sessionEpoch },
    hiddenExtras: row.hiddenExtras,
  };
}

export type { LoginLinkRequest, LoginLinkUser };
export {
  LOGIN_LINK_LIFETIME_MINUTES,
  readLoginLinkUser,
  requestLoginLink,
  sendLoginLink,
};
