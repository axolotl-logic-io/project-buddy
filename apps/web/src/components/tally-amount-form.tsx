"use client";

import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  type SubmitEvent,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { parseAmount } from "@/tallies/tally.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";

function focusField(input: HTMLInputElement | null): void {
  input?.focus();
  input?.select();
}

// A number field for a tally's amount, such as one to add to today's total
// or a day's new total. Fractions and negatives are fine. Saving closes
// it; Escape or Cancel closes it without saving.
function TallyAmountForm({
  label,
  submit,
  initial = "",
  disabled,
  onSave,
  onClose,
}: {
  readonly label: string;
  readonly submit: string;
  readonly initial?: string;
  readonly disabled: boolean;
  readonly onSave: (amount: string) => Promise<boolean>;
  readonly onClose: () => void;
}): JSX.Element {
  const [text, setText] = useState(initial);
  const [problem, setProblem] = useState<string | undefined>();
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setText(event.currentTarget.value);
    setProblem(undefined);
  }, []);
  const save = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const amount = parseAmount(text);
      if (amount === undefined) {
        setProblem(TALLIES_COPY.problems["invalid-amount"]);
        return;
      }
      if (await onSave(amount)) {
        onClose();
      }
    },
    [onClose, onSave, text],
  );
  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );
  return (
    <form className="tally-form" onSubmit={save}>
      <TextField
        ref={focusField}
        label={label}
        type="number"
        inputMode="decimal"
        step="any"
        value={text}
        onChange={change}
        onKeyDown={keyDown}
        error={problem}
        disabled={disabled}
      />
      <span className="tally-form-actions">
        <Button type="submit" variant="secondary" disabled={disabled}>
          {submit}
        </Button>
        <Button variant="quiet" onClick={onClose}>
          {TALLIES_COPY.cancel}
        </Button>
      </span>
    </form>
  );
}

export { TallyAmountForm };
