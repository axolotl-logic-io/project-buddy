"use client";

import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// Resets an own buddy's, activity's or spell's prompt (part, such as
// "instructions") once the user confirms, since the reset replaces their saved
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
  readonly action: (formData: FormData) => Promise<void>;
  readonly idField: string;
  readonly id: string;
  readonly part: string;
  readonly source: string | undefined;
}): JSX.Element {
  const [completed, setCompleted] = useState<boolean>(false);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const submit = useCallback(
    async (data: FormData): Promise<void> => {
      setCompleted(false);
      await action(data);
      setCompleted(true);
    },
    [action],
  );
  useEffect(() => {
    if (completed) {
      resultRef.current?.focus();
    }
  }, [completed]);
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={submit} ref={formRef}>
      {completed === true && (
        <p ref={resultRef} role="status" tabIndex={-1}>
          {PROMPT_COPY.resetComplete(part, source)}
        </p>
      )}
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
