"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearFailedLogins,
  clientKeyFromHeaders,
  isLockedOut,
  readFailedLogins,
  recordFailedLogin,
} from "@/auth/failed-logins.ts";
import { constantTimeEqual } from "@/auth/hmac.ts";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token.ts";
import { getDb } from "@/db/client.ts";
import { readSessionSecret, readSitePassphrase } from "@/env.ts";
import { COPY } from "@/ui/copy.ts";

export interface LoginState {
  error?: string;
}

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const db = getDb();
  const clientKey = clientKeyFromHeaders(await headers());
  const now = new Date();

  if (isLockedOut(await readFailedLogins(db, clientKey), now)) {
    return { error: COPY.login.lockedOut };
  }

  const passphrase = String(formData.get("passphrase") ?? "");
  if (!(await constantTimeEqual(passphrase, readSitePassphrase()))) {
    await recordFailedLogin(db, clientKey, now);
    return { error: COPY.login.wrongPassphrase };
  }

  await clearFailedLogins(db, clientKey);
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    await createSessionToken(readSessionSecret(), now),
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
