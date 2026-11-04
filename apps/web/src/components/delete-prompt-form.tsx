"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { PromptKind } from "@/prompts/prompt.ts";
import { DELETE_PROMPT_COPY } from "@/ui/copy/prompts.ts";

// Deletes one of the user's own buddies, activities or spells once they
// confirm. The dialog says what deleting it changes, and, for one bought in
// the Marketplace, that no gold comes back. action receives the prompt's id
// as `promptId`.
export function DeletePromptForm({
  action,
  kind,
  promptId,
  name,
  bought,
}: {
  readonly action: (formData: FormData) => Promise<never>;
  readonly kind: PromptKind;
  readonly promptId: string;
  readonly name: string;
  readonly bought: boolean;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={action} ref={formRef}>
      <input name="promptId" type="hidden" value={promptId} />
      <ConfirmDialog
        cancelLabel={DELETE_PROMPT_COPY.cancel}
        confirmLabel={DELETE_PROMPT_COPY.confirm(kind)}
        description={DELETE_PROMPT_COPY.description(kind, name, bought)}
        onConfirm={confirm}
        title={DELETE_PROMPT_COPY.title(kind)}
        trigger={
          <Button
            aria-label={DELETE_PROMPT_COPY.deleteLabel(name)}
            variant="quiet"
          >
            <Icon name="trash" />
            {DELETE_PROMPT_COPY.delete}
          </Button>
        }
      />
    </form>
  );
}
