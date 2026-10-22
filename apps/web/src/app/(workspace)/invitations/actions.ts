"use server";

import { headers } from "next/headers";
import { sendWithinInvitationLimits } from "@/accounts/invitation-send-limits.ts";
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
  const admin = await requireAdmin();
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
    const requestHeaders = await headers();
    const sent = await sendWithinInvitationLimits(admin.id, parsed.data, () =>
      sendInvitation(parsed.data, requestHeaders),
    );
    if (!sent) {
      return { kind: "error", message: INVITATIONS_COPY.limited, email: typed };
    }
  } catch (error) {
    logEmailFailure("our-bug", "send invitation", error);
    return { kind: "error", message: INVITATIONS_COPY.failed, email: typed };
  }
  return { kind: "sent", message: INVITATIONS_COPY.sent, email: typed };
}
