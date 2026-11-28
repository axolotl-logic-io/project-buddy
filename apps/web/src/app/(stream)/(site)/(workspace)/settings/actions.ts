"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TIME_ZONE } from "@/accounts/time-zone.ts";
import { endEverySession, saveTimeZone } from "@/accounts/users-store.ts";
import { requireUser } from "@/auth/current-user.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

// The time zone form's state: as first shown, saved, or refused because
// the browser or Postgres doesn't know the time zone.
type SetTimeZoneState =
  | { readonly kind: "idle" }
  | { readonly kind: "saved" }
  | { readonly kind: "invalid"; readonly message: string };
const SAVED: SetTimeZoneState = { kind: "saved" };
const UNKNOWN: SetTimeZoneState = {
  kind: "invalid",
  message: ACCOUNT_COPY.timeZoneUnknown,
};

export type { SetTimeZoneState };

// Saves the time zone whose midnight starts the signed-in user's quest
// days, and those of the quests they own. The form names no user.
export async function setTimeZoneAction(
  _state: SetTimeZoneState,
  formData: FormData,
): Promise<SetTimeZoneState> {
  const user = await requireUser();
  const timeZone = TIME_ZONE.safeParse(formData.get("timeZone"));
  if (!(timeZone.success && (await saveTimeZone(user.id, timeZone.data)))) {
    return UNKNOWN;
  }
  return SAVED;
}

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
