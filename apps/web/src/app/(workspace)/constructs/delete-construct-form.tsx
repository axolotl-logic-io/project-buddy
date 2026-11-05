"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { SaleState } from "@/marketplace/listing-store.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { deleteConstructAction } from "./actions.ts";

// Deletes their construct once they confirm, then shows Constructs.
export function DeleteConstructForm({
  constructId,
  name,
  sale,
}: {
  readonly constructId: string;
  readonly name: string;
  readonly sale: SaleState["kind"];
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={deleteConstructAction} ref={formRef}>
      <input name="constructId" type="hidden" value={constructId} />
      <ConfirmDialog
        cancelLabel={CONSTRUCTS_COPY.deleteCancel}
        confirmLabel={CONSTRUCTS_COPY.deleteConfirm}
        description={
          CONSTRUCTS_COPY.deleteDescription(name) +
          PROMPT_COPY.deleteConsequences(sale)
        }
        onConfirm={confirm}
        title={CONSTRUCTS_COPY.deleteTitle}
        trigger={
          <Button
            aria-label={CONSTRUCTS_COPY.deleteLabel(name)}
            variant="quiet"
          >
            <Icon name="trash" />
            {CONSTRUCTS_COPY.delete}
          </Button>
        }
      />
    </form>
  );
}
