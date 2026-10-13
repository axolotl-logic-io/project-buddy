"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readLoginLinkUser } from "@/accounts/login-links.ts";
import { sessionCookie } from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { seedHiddenFlags } from "@/flags/seed-hidden-flags.ts";

// A missing or non-text token reads as an empty one, which no link holds.
const TOKEN_FIELD = z.string().catch("");

// Signs the browser in for 30 days as the user whose link holds the form's
// token, with the extras her account hides, then shows the home page. If
// the link has expired since its page opened, or no longer works, shows
// that page again, which says so.
export async function continueSignInAction(formData: FormData): Promise<never> {
  const token = TOKEN_FIELD.parse(formData.get("token"));
  const now = new Date();
  const user = await readLoginLinkUser(token, now);
  if (user === undefined) {
    const linkPage = new URLSearchParams({ token });
    return redirect(`/login/link?${linkPage.toString()}`);
  }
  await seedHiddenFlags(user);
  (await cookies()).set(await sessionCookie(user, readSessionSecret(), now));
  return redirect("/");
}
