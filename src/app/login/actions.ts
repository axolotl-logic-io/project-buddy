"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { attemptLogin } from "@/auth/login.ts";
import { COPY } from "@/ui/copy.ts";

// A missing or non-text passphrase reads as an empty one, which never matches,
// so a malformed form counts as a wrong passphrase.
const LOGIN_FORM = z.object({ passphrase: z.string().catch("") });

export type LoginState =
  | { readonly kind: "idle" }
  | { readonly kind: "error"; readonly message: string };

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const { passphrase } = LOGIN_FORM.parse(Object.fromEntries(formData));
  const result = await attemptLogin({
    passphrase,
    requestHeaders: await headers(),
  });
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
