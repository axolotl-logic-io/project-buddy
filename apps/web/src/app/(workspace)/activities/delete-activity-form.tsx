"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { deleteActivityAction } from "./actions.ts";

// Deletes their activity once they confirm, then shows Activities.
export function DeleteActivityForm({
  activityId,
  name,
}: {
  readonly activityId: string;
  readonly name: string;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={deleteActivityAction} ref={formRef}>
      <input name="activityId" type="hidden" value={activityId} />
      <ConfirmDialog
        cancelLabel={ACTIVITIES_COPY.deleteCancel}
        confirmLabel={ACTIVITIES_COPY.deleteConfirm}
        description={ACTIVITIES_COPY.deleteDescription(name)}
        onConfirm={confirm}
        title={ACTIVITIES_COPY.deleteTitle}
        trigger={
          <Button
            aria-label={ACTIVITIES_COPY.deleteLabel(name)}
            variant="quiet"
          >
            <Icon name="trash" />
            {ACTIVITIES_COPY.delete}
          </Button>
        }
      />
    </form>
  );
}
