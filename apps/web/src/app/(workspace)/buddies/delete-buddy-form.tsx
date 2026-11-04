"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { deleteBuddyAction } from "./actions.ts";

// Deletes their buddy once they confirm, then shows Buddies.
export function DeleteBuddyForm({
  buddyId,
  name,
}: {
  readonly buddyId: string;
  readonly name: string;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={deleteBuddyAction} ref={formRef}>
      <input name="buddyId" type="hidden" value={buddyId} />
      <ConfirmDialog
        cancelLabel={BUDDIES_COPY.deleteCancel}
        confirmLabel={BUDDIES_COPY.deleteConfirm}
        description={BUDDIES_COPY.deleteDescription(name)}
        onConfirm={confirm}
        title={BUDDIES_COPY.deleteTitle}
        trigger={
          <Button aria-label={BUDDIES_COPY.deleteLabel(name)} variant="quiet">
            <Icon name="trash" />
            {BUDDIES_COPY.delete}
          </Button>
        }
      />
    </form>
  );
}
