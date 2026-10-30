"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  checkUserName,
  USER_NAME_MAX_LENGTH,
  type UserNameCheck,
  type UserNameProblem,
} from "@/accounts/user-name.ts";
import { endEverySession, saveUserName } from "@/accounts/users-store.ts";
import { requireUser } from "@/auth/current-user.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const SET_NAME_FORM = z.object({ name: z.string() });

// What saving her name did: saved it (or cleared it), or refused it, saying
// why. A storage failure throws, for the error boundary.
type SetNameResult =
  | { readonly kind: "saved" }
  | { readonly kind: "invalid"; readonly message: string };

// The name form's state: as first shown, or after a save.
type SetNameState = { readonly kind: "idle" } | SetNameResult;

// What the form says for a refused name.
function refusal(problem: UserNameProblem): string {
  switch (problem) {
    case "multi-line":
      return ACCOUNT_COPY.nameMultiLine;
    case "too-long":
      return ACCOUNT_COPY.nameTooLong(USER_NAME_MAX_LENGTH);
    case "braces":
      return ACCOUNT_COPY.nameBraces;
    default: {
      const unhandled: never = problem;
      return unhandled;
    }
  }
}

// The name to save for a name that isn't refused: undefined once cleared.
function savedName(check: UserNameCheck): string | undefined {
  if (check.kind === "valid") {
    return check.name;
  }
  return undefined;
}

export type { SetNameResult, SetNameState };

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

// Saves her name, trimmed, for the buddy to call her by, or clears it when
// the field is empty, or says why the name won't do. It saves only the
// signed-in user's own name: the form names no user.
export async function setNameAction(
  _state: SetNameState,
  formData: FormData,
): Promise<SetNameResult> {
  const user = await requireUser();
  const form = SET_NAME_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const check = checkUserName(form.data.name);
  if (check.kind === "refused") {
    return { kind: "invalid", message: refusal(check.problem) };
  }
  await saveUserName(user.id, savedName(check));
  refresh();
  return { kind: "saved" };
}
