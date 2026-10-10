"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionSecret, readSitePassphrase } from "@/env";
import {
  clearFailedLogins,
  clientKeyFromHeaders,
  isLockedOut,
  readFailedLogins,
  recordFailedLogin,
} from "@/auth/failed-logins";
import { passphraseMatches } from "@/auth/passphrase";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token";
import { getDb } from "@/db/client";

export type LoginState = { error?: string };

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const db = getDb();
  const clientKey = clientKeyFromHeaders(await headers());
  const now = new Date();

  if (isLockedOut(await readFailedLogins(db, clientKey), now)) {
    return { error: "Too many failed attempts. Try again later." };
  }

  const passphrase = String(formData.get("passphrase") ?? "");
  if (!passphraseMatches(passphrase, readSitePassphrase())) {
    await recordFailedLogin(db, clientKey, now);
    return { error: "Wrong passphrase." };
  }

  await clearFailedLogins(db, clientKey);
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    createSessionToken(readSessionSecret(), now),
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  );
  redirect("/");
}
