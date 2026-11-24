"use client";

import { type JSX, useCallback, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { changeRiteAction } from "@/rites/rite-actions.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

// Restore, busy while its request runs, so a second press sends nothing.
function RestoreButton(): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="change"
      value="restore"
      variant="secondary"
      aria-busy={pending}
      disabled={pending}
    >
      {GRIMOIRE_COPY.restore}
    </Button>
  );
}

// Restore and Delete forever for one of the user's forgotten rites. Delete
// forever asks first, in a dialog that names the rite; Keep forgotten
// cancels. Either change leads to the Forgotten tab, whose notice reports
// it and takes the focus.
function ForgottenRiteActions({
  id,
  name,
}: {
  readonly id: string;
  readonly name: string;
}): JSX.Element {
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const deleteForever = useCallback((): void => {
    deleteFormRef.current?.requestSubmit();
  }, []);
  return (
    <div className="flex flex-wrap gap-3">
      <form action={changeRiteAction}>
        <input type="hidden" name="id" value={id} />
        <RestoreButton />
      </form>
      <form action={changeRiteAction} ref={deleteFormRef}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="change" value="delete" />
        <ConfirmDialog
          cancelLabel={GRIMOIRE_COPY.keepForgotten}
          confirmLabel={GRIMOIRE_COPY.delete}
          description={GRIMOIRE_COPY.confirmDeleteDetail}
          focusHandledOnConfirm={true}
          onConfirm={deleteForever}
          title={GRIMOIRE_COPY.confirmDelete(name)}
          trigger={<Button variant="danger">{GRIMOIRE_COPY.delete}</Button>}
          variant="danger"
        />
      </form>
    </div>
  );
}

export { ForgottenRiteActions };
