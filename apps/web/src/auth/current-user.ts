// Who is signed in, for pages, Server Actions and route handlers. The proxy
// has already checked the session cookie's signature and expiry; this also
// reads the user, once per request, so a session whose epoch the user has
// since raised, or whose user is gone, is signed out.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { readSessionUser, type User } from "@/accounts/users-store.ts";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { SIGN_IN_PATH } from "@/routes.ts";

// The signed-in user, or undefined when the request has no valid session.
// Reads the cookie; the root layout's header calls it outside any Suspense
// boundary, which the root layout's `instant = false` allows. Waits for
// the request (`connection`) before reading the clock, which Next forbids
// in a prerender, and a prerender with cookies, such as a prefetch, would
// otherwise reach.
const currentUser: () => Promise<User | undefined> = cache(
  async (): Promise<User | undefined> => {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    await connection();
    const session = await readSessionToken(
      token,
      readSessionSecret(),
      new Date(),
    );
    if (session === undefined) {
      return undefined;
    }
    return readSessionUser(session.id, session.sessionEpoch);
  },
);

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
