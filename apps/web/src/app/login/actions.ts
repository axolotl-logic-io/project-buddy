"use server";

import { headers } from "next/headers";
import {
  answerLinkRequest,
  EMAIL_FIELD,
  typedEmail,
} from "@/app/login/link-request.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";

// Emails a sign-in link to the address's account, if it has one and is
// within the rate limits, and answers "check your email" either way, so the
// answer reveals neither. Or says the address is not one, or why the
// request couldn't be taken.
export async function requestSignInLinkAction(
  _state: LinkRequestState,
  formData: FormData,
): Promise<LinkRequestState> {
  const typed = typedEmail(formData);
  const email = EMAIL_FIELD.safeParse(typed);
  if (!email.success) {
    return {
      kind: "invalid",
      field: "email",
      message: LOGIN_COPY.needsEmail,
      email: typed,
    };
  }
  return answerLinkRequest(
    {
      email: email.data,
      requestHeaders: await headers(),
    },
    LOGIN_COPY.checkEmail,
  );
}
