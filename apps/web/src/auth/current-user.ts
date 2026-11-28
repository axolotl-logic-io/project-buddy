// Who is signed in, for pages, Server Actions and route handlers. The proxy
// has already checked the session cookie's signature and expiry; this checks
// them again and reads the user, so a session whose epoch the user has since
// raised, or whose user is gone, is signed out.
//
// The check is a private cache ("use cache: private"): Next never keeps it
// on the server, so every request that renders, every Server Action and
// every route handler reads the user again, but the browser's router may
// keep a prefetched page, the session's App Shell, for its stale time. A
// session signed out everywhere can still see such a page it already has
// for that long, and nothing it sends is accepted.

import { cacheLife } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionUser, type User } from "@/accounts/users-store.ts";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { SIGN_IN_PATH } from "@/routes.ts";

// The signed-in user, or undefined when the request has no valid session.
async function currentUser(): Promise<User | undefined> {
  "use cache: private";
  cacheLife("default");
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await readSessionToken(
    token,
    readSessionSecret(),
    new Date(),
  );
  if (session === undefined) {
    return;
  }
  return await readSessionUser(session.id, session.sessionEpoch);
}

// The signed-in user. A signed-out request is redirected to the sign-in
// page, from a page and from a Server Action alike, so the forms never
// handle being signed out. Route handlers answer with the signed-out case
// instead, through currentUser.
async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (user === undefined) {
    redirect(SIGN_IN_PATH);
  }
  return user;
}

export { currentUser, requireUser };
