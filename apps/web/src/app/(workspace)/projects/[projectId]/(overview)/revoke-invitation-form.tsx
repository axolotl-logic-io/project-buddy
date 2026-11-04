"use client";

import { type JSX, startTransition, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { PROJECT_INVITE_COPY } from "@/ui/copy/project-invitations.ts";
import { revokeProjectInvitationAction } from "./actions.ts";

export function RevokeInvitationForm({
  invitationId,
  email,
}: {
  readonly invitationId: string;
  readonly email: string;
}): JSX.Element {
  const confirm = useCallback((): void => {
    startTransition(async () => {
      const form = new FormData();
      form.set("invitationId", invitationId);
      await revokeProjectInvitationAction(form);
      document.querySelector<HTMLElement>("#project-invite-heading")?.focus();
    });
  }, [invitationId]);
  return (
    <ConfirmDialog
      title={PROJECT_INVITE_COPY.revokeTitle}
      description={PROJECT_INVITE_COPY.revokeDescription(email)}
      confirmLabel={PROJECT_INVITE_COPY.revoke}
      cancelLabel={PROJECT_INVITE_COPY.keepInvitation}
      onConfirm={confirm}
      confirmFocusId="project-invite-heading"
      trigger={
        <Button
          aria-label={PROJECT_INVITE_COPY.revokeLabel(email)}
          variant="secondary"
        >
          {PROJECT_INVITE_COPY.revoke}
        </Button>
      }
    />
  );
}
