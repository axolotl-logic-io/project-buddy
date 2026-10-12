import { Label } from "radix-ui";
import { type ComponentProps, type JSX, type ReactNode, useId } from "react";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";

// The words around a field's control: its label, an optional hint, and the
// error that the form's last answer found in it, if any.
interface FieldWords {
  readonly label: string;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
}

// The attributes a field gives its control, so the control is named by the
// label, described by the hint and the error, and marked invalid while the
// error shows.
interface ControlWiring {
  readonly id: string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: true;
}

// A control's own attributes. className adds utilities to the field's look,
// such as a textarea's height.
type ControlProps<Tag extends "input" | "textarea" | "select"> = Omit<
  ComponentProps<Tag>,
  "id" | "aria-describedby" | "aria-invalid"
>;

// The ids of the field's parts, and the wiring for its control.
function useFieldIds({ hint, error }: FieldWords): {
  hintId: string;
  errorId: string;
  wiring: ControlWiring;
} {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy: string[] = [];
  if (hint !== undefined) {
    describedBy.push(hintId);
  }
  let wiring: ControlWiring = { id };
  if (error !== undefined) {
    describedBy.push(errorId);
    wiring = { ...wiring, "aria-invalid": true };
  }
  if (describedBy.length > 0) {
    wiring = { ...wiring, "aria-describedby": describedBy.join(" ") };
  }
  return { hintId, errorId, wiring };
}

// The label, the hint, the control and the error, in that order.
function FieldFrame({
  words: { label, hint, error },
  ids: { hintId, errorId, wiring },
  children,
}: {
  readonly words: FieldWords;
  readonly ids: ReturnType<typeof useFieldIds>;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="field">
      <Label.Root className="field-label" htmlFor={wiring.id}>
        {label}
      </Label.Root>
      {hint !== undefined && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {children}
      {error !== undefined && <Alert id={errorId}>{error}</Alert>}
    </div>
  );
}

// A labelled one-line input, such as a name or a passphrase.
export function TextField({
  label,
  hint,
  error,
  className = "",
  ...input
}: FieldWords & ControlProps<"input">): JSX.Element {
  const words = { label, hint, error };
  const ids = useFieldIds(words);
  return (
    <FieldFrame ids={ids} words={words}>
      <input
        className={`input-field ${className}`}
        {...input}
        {...ids.wiring}
      />
    </FieldFrame>
  );
}

// A labelled multi-line input, such as the project's memory.
export function TextAreaField({
  label,
  hint,
  error,
  className = "",
  ...textarea
}: FieldWords & ControlProps<"textarea">): JSX.Element {
  const words = { label, hint, error };
  const ids = useFieldIds(words);
  return (
    <FieldFrame ids={ids} words={words}>
      <textarea
        className={`input-field ${className}`}
        {...textarea}
        {...ids.wiring}
      />
    </FieldFrame>
  );
}

// A labelled choice of one option from a list, such as a chat's project.
// children are its <option>s.
export function SelectField({
  label,
  hint,
  error,
  className = "",
  ...select
}: FieldWords & ControlProps<"select">): JSX.Element {
  const words = { label, hint, error };
  const ids = useFieldIds(words);
  return (
    <FieldFrame ids={ids} words={words}>
      <div className="relative">
        <select
          className={`input-field appearance-none pr-9 ${className}`}
          {...select}
          {...ids.wiring}
        />
        <Icon
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          name="chevron-down"
        />
      </div>
    </FieldFrame>
  );
}
