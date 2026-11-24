"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticateEmailedLink } from "@/accounts/authenticate-emailed-link.ts";
import { sessionCookie } from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import {
  HOME_PATH,
  localPath,
  SIGN_IN_DESTINATION_PARAMETER,
  SIGN_IN_LINK_PATH,
} from "@/routes.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";

// A missing or non-text token reads as an empty one, which no link holds.
type ContinueSignInState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string };

const TOKEN_FIELD = z.string().catch("");

const NAME_INVALID: ContinueSignInState = {
  kind: "invalid",
  message: LINK_PAGE_COPY.nameInvalid,
};

// Signs the browser in for 30 days as the user whose emailed link holds the
// form's token, then opens where the link leads:
// - A quest invitation's acceptance link accepts that one invitation and
//   opens its quest.
// - A sign-in link opens its local destination, if it has one, or else
//   Quests.
// - A sign-up link creates the account and opens Quests.
// An invited account, which a quest invitation created, completes its
// sign-up with the name the form gives, whichever link it continues from.
// If the link has expired since its page opened, or no longer works, shows
// that page again, which says so.
export async function continueSignInAction(
  formData: FormData,
): Promise<ContinueSignInState> {
  const token = TOKEN_FIELD.parse(formData.get("token"));
  const name = TOKEN_FIELD.parse(formData.get("name"));
  const destination = localPath(formData.get(SIGN_IN_DESTINATION_PARAMETER));
  const now = new Date();
  const authentication = await authenticateEmailedLink(token, name, now);
  if (authentication.kind === "needs-name") {
    return NAME_INVALID;
  }
  if (authentication.kind !== "authenticated") {
    const linkPage = new URLSearchParams({ token });
    return redirect(`${SIGN_IN_LINK_PATH}?${linkPage.toString()}`);
  }
  (await cookies()).set(
    await sessionCookie(authentication.user, readSessionSecret(), now),
  );
  if (authentication.questId !== undefined) {
    return redirect(`/quests/${authentication.questId}`);
  }
  return redirect(destination ?? HOME_PATH);
}

export type { ContinueSignInState };
