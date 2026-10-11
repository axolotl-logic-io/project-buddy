"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { attemptLogin, type LoginResult } from "@/auth/login.ts";
import { AppError } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

// A missing or non-text passphrase reads as an empty one, which never matches,
// so a malformed form counts as a wrong passphrase.
const LOGIN_FORM = z.object({ passphrase: z.string().catch("") });

type LoginState =
  | { readonly kind: "idle" }
  | { readonly kind: "error"; readonly message: string };

// The login attempt's result, or the AppError that stopped it, such as the
// database being unreachable.
async function tryLogin(passphrase: string): Promise<LoginResult | AppError> {
  try {
    return await attemptLogin({ passphrase, requestHeaders: await headers() });
  } catch (error) {
    if (error instanceof AppError) {
      return error;
    }
    throw error;
  }
}

// Signs in and redirects home, or says in the form why not: a wrong
// passphrase, a lockout, or the failure's case message.
export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const { passphrase } = LOGIN_FORM.parse(Object.fromEntries(formData));
  const result = await tryLogin(passphrase);
  if (result instanceof AppError) {
    return { kind: "error", message: result.message };
  }
  switch (result.kind) {
    case "signed-in":
      (await cookies()).set(result.sessionCookie);
      return redirect("/");
    case "locked-out":
      return { kind: "error", message: COPY.login.lockedOut };
    case "wrong-passphrase":
      return { kind: "error", message: COPY.login.wrongPassphrase };
    default:
      return result satisfies never;
  }
}

export type { LoginState };
