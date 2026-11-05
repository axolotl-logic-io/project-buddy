"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { SaleState } from "@/marketplace/listing-store.ts";
import { GUILD_COPY } from "@/ui/copy/guild.ts";
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
        cancelLabel={GUILD_COPY.deleteCancel}
        confirmLabel={GUILD_COPY.deleteConfirm}
        description={
          GUILD_COPY.deleteDescription(name) +
          PROMPT_COPY.deleteConsequences(sale)
        }
        onConfirm={confirm}
        title={GUILD_COPY.deleteTitle}
        trigger={
          <Button aria-label={GUILD_COPY.deleteLabel(name)} variant="quiet">
            <Icon name="trash" />
            {GUILD_COPY.delete}
          </Button>
        }
      />
    </form>
  );
}
