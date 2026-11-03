"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import { sessionCookie } from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { seedHiddenFlags } from "@/flags/seed-hidden-flags.ts";
import { stopNotificationsToThisBrowser } from "@/push/push-device-cookie.ts";
import {
  HOME_PATH,
  localPath,
  SIGN_IN_DESTINATION_PARAMETER,
  SIGN_IN_LINK_PATH,
} from "@/routes.ts";

// A missing or non-text token reads as an empty one, which no link holds.
const TOKEN_FIELD = z.string().catch("");

// Signs the browser in for 30 days as the user whose link holds the form's
// token, with the extras her account hides, then shows the link's
// destination, if it has a local one, or else the home page. If the link has
// expired since its page opened, or no longer works, shows that page again,
// which says so. Another user's notifications stop going to this browser.
export async function continueSignInAction(formData: FormData): Promise<never> {
  const token = TOKEN_FIELD.parse(formData.get("token"));
  const destination = localPath(formData.get(SIGN_IN_DESTINATION_PARAMETER));
  const now = new Date();
  const found = await readSignInLinkUser(token, now);
  if (found === undefined) {
    const linkPage = new URLSearchParams({ token });
    return redirect(`${SIGN_IN_LINK_PATH}?${linkPage.toString()}`);
  }
  await seedHiddenFlags(found.hiddenExtras);
  await stopNotificationsToThisBrowser(found.user.id);
  (await cookies()).set(
    await sessionCookie(found.user, readSessionSecret(), now),
  );
  return redirect(destination ?? HOME_PATH);
}
