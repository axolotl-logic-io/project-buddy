"use client";

// A prompt's fields, a buddy's or an activity's, rendered in the browser,
// where useId gives each field's label the id of its own control.
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import type { PromptPartField } from "@/prompts/prompt-part-field.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// The id of the form that resets this part, outside the form that saves the
// parts, since forms don't nest.
function resetFormId(key: string): string {
  return `reset-${key}`;
}

// The name field of her own prompt.
export function PromptNameField({
  name,
}: {
  readonly name: string;
}): JSX.Element {
  return (
    <TextField
      defaultValue={name}
      label={PROMPT_COPY.nameLabel}
      name="name"
      required={true}
    />
  );
}

// Every part of a prompt as a labelled textarea, in the page's order. Each
// part of her own prompt is a field of the form around it, with a button
// that resets the part through its own form (PromptResetForms); a built-in
// prompt's parts are read-only.
export function PromptPartFields({
  fields,
  editable,
}: {
  readonly fields: readonly PromptPartField[];
  readonly editable: boolean;
}): JSX.Element {
  return (
    <div className="panel flex flex-col gap-6">
      {fields.map(({ key, label, help, text }) => (
        <div className="flex flex-col gap-2" key={key}>
          <TextAreaField
            className="min-h-40 font-mono text-sm"
            defaultValue={text}
            hint={[help, PROMPT_COPY.namePlaceholderHint].join(" ")}
            label={label}
            name={key}
            readOnly={!editable}
          />
          {editable === true && (
            <Button
              aria-label={PROMPT_COPY.resetLabel(label)}
              className="self-start"
              form={resetFormId(key)}
              type="submit"
              variant="quiet"
            >
              {PROMPT_COPY.reset}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// The forms that reset each part of her prompt with this id, which
// PromptPartFields' buttons submit. Each sends the prompt's id as idField and
// the part's key as part. They show nothing.
export function PromptResetForms({
  keys,
  idField,
  id,
  action,
}: {
  readonly keys: readonly string[];
  readonly idField: string;
  readonly id: string;
  readonly action: (formData: FormData) => Promise<never>;
}): JSX.Element {
  return (
    <div hidden={true}>
      {keys.map((key) => (
        <form action={action} id={resetFormId(key)} key={key}>
          <input name={idField} type="hidden" value={id} />
          <input name="part" type="hidden" value={key} />
        </form>
      ))}
    </div>
  );
}
