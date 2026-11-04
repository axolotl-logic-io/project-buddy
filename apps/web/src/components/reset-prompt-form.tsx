"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// Resets an own buddy's, activity's or spell's prompt (part, such as
// "instructions") once she confirms, since the reset replaces her saved
// text for good. The button and the dialog name what it restores: the
// built-in one called source, or the starter text when source is undefined.
// action receives the form, with the prompt's id under idField.
export function ResetPromptForm({
  action,
  idField,
  id,
  part,
  source,
}: {
  readonly action: (formData: FormData) => Promise<never>;
  readonly idField: string;
  readonly id: string;
  readonly part: string;
  readonly source: string | undefined;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={action} ref={formRef}>
      <input name={idField} type="hidden" value={id} />
      <ConfirmDialog
        cancelLabel={PROMPT_COPY.resetCancel(part)}
        confirmLabel={PROMPT_COPY.resetConfirm(part)}
        description={PROMPT_COPY.resetDescription(part, source)}
        onConfirm={confirm}
        title={PROMPT_COPY.resetTitle(part, source)}
        trigger={
          <Button type="button" variant="quiet">
            {PROMPT_COPY.resetLabel(part, source)}
          </Button>
        }
      />
    </form>
  );
}
