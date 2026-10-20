"use server";

import { typedEmail } from "@/app/login/link-request.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

// Legacy submissions, including the former shared code, can never create accounts.
// Server Actions must be async even when this refusal has no I/O.
export async function signUpAction(
  _state: LinkRequestState,
  formData: FormData,
): Promise<Extract<LinkRequestState, { kind: "error" }>> {
  return await Promise.resolve<Extract<LinkRequestState, { kind: "error" }>>({
    kind: "error",
    message: SIGNUP_COPY.intro,
    email: typedEmail(formData),
  });
}
