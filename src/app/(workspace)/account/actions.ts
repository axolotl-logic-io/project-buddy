"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { endEverySession } from "@/accounts/users-store.ts";
import { requireUser } from "@/auth/current-user.ts";
import { SESSION_COOKIE_NAME, SIGN_IN_PATH } from "@/auth/session-token.ts";

// Signs this browser out, then shows the sign-in page. Her other browsers
// stay signed in, and her unexpired sign-in links still work.
export async function signOutAction(): Promise<never> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return redirect(SIGN_IN_PATH);
}

// Signs her out of every browser, this one included, and makes every
// sign-in link sent before unusable, then shows the sign-in page. The page
// asks her to confirm first.
export async function signOutEverywhereAction(): Promise<never> {
  const user = await requireUser();
  await endEverySession(user.id);
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return redirect(SIGN_IN_PATH);
}
