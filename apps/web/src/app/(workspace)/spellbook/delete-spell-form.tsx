"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { deleteSpellAction } from "./actions.ts";

// Deletes their spell once they confirm, then shows the Spellbook.
export function DeleteSpellForm({
  spellId,
  name,
}: {
  readonly spellId: string;
  readonly name: string;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={deleteSpellAction} ref={formRef}>
      <input name="spellId" type="hidden" value={spellId} />
      <ConfirmDialog
        cancelLabel={SPELLBOOK_COPY.deleteCancel}
        confirmLabel={SPELLBOOK_COPY.deleteConfirm}
        description={SPELLBOOK_COPY.deleteDescription(name)}
        onConfirm={confirm}
        title={SPELLBOOK_COPY.deleteTitle}
        trigger={
          <Button aria-label={SPELLBOOK_COPY.deleteLabel(name)} variant="quiet">
            <Icon name="trash" />
            {SPELLBOOK_COPY.delete}
          </Button>
        }
      />
    </form>
  );
}
