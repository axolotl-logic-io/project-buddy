"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptInvitation } from "@/accounts/invitations.ts";
import { sessionCookie } from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { seedHiddenFlags } from "@/flags/seed-hidden-flags.ts";

// A missing or non-text token reads as an empty one, which no link holds.
const TOKEN_FIELD = z.string().catch("");

// Creates the token's fixed-address account once and signs this browser in
// for the normal session lifetime. A used or replaced token grants nothing.
export async function confirmSetupAction(formData: FormData): Promise<never> {
  const token = TOKEN_FIELD.parse(formData.get("token"));
  const found = await acceptInvitation(token);
  if (found === undefined) {
    const linkPage = new URLSearchParams({ token });
    return redirect(`/setup?${linkPage.toString()}`);
  }
  await seedHiddenFlags([]);
  (await cookies()).set(
    await sessionCookie(found, readSessionSecret(), new Date()),
  );
  return redirect("/");
}
