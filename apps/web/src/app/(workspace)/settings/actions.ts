"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { endEverySession } from "@/accounts/users-store.ts";
import { requireUser } from "@/auth/current-user.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { SIGN_IN_PATH } from "@/routes.ts";

// Signs this browser out, keeping other sessions and sign-in links valid.
export async function signOutAction(): Promise<never> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return redirect(SIGN_IN_PATH);
}

// Ends every session and invalidates existing sign-in links for this user.
export async function signOutEverywhereAction(): Promise<never> {
  const user = await requireUser();
  try {
    await endEverySession(user.id);
  } finally {
    (await cookies()).delete(SESSION_COOKIE_NAME);
  }
  return redirect(SIGN_IN_PATH);
}
