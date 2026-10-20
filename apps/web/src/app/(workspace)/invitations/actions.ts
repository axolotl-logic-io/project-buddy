"use server";

import { headers } from "next/headers";
import { sendInvitation } from "@/accounts/invitations.ts";
import { EMAIL_FIELD, typedEmail } from "@/app/login/link-request.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { requireAdmin } from "@/auth/require-admin.ts";
import { logEmailFailure } from "@/errors/error-log.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";

export async function sendInvitationAction(
  _state: LinkRequestState,
  formData: FormData,
): Promise<Exclude<LinkRequestState, { kind: "idle" }>> {
  await requireAdmin();
  const typed = typedEmail(formData);
  const parsed = EMAIL_FIELD.safeParse(typed);
  if (!parsed.success) {
    return {
      kind: "invalid",
      field: "email",
      message: INVITATIONS_COPY.needsEmail,
      email: typed,
    };
  }
  try {
    await sendInvitation(parsed.data, await headers());
  } catch (error) {
    logEmailFailure("our-bug", "send invitation", error);
    return { kind: "error", message: INVITATIONS_COPY.failed, email: typed };
  }
  return { kind: "sent", message: INVITATIONS_COPY.sent, email: typed };
}
