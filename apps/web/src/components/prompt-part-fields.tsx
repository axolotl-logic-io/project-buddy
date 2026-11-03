"use client";

// A prompt's fields, a buddy's, an activity's or a spell's, rendered in the browser,
// where useId gives each field's label the id of its own control.
import { type JSX, useId } from "react";
import { Markdown } from "@/components/markdown.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import type { PromptPartField } from "@/prompts/prompt-part-field.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// The id of the form that resets this part, outside the form that saves the
// parts, since forms don't nest.
function resetFormId(key: string): string {
  return `reset-${key}`;
}

// The level of a part's own "#" heading: below the part's h3 label, which
// sits under the page's h1 and its section's h2.
const PART_TOP_HEADING_LEVEL = 4;

// A built-in part as selectable Markdown, named by its heading and
// described by the same help text as its editable field.
function ReadOnlyPart({
  field: { label, help, text },
}: {
  readonly field: PromptPartField;
}): JSX.Element {
  const id = useId();
  const headingId = `${id}-heading`;
  const helpId = `${id}-help`;
  return (
    <section
      aria-describedby={helpId}
      aria-labelledby={headingId}
      className="wrap-anywhere flex min-w-0 flex-col gap-2"
    >
      <h3 className="field-label" id={headingId}>
        {label}
      </h3>
      <p className="field-hint" id={helpId}>
        {[help, PROMPT_COPY.namePlaceholderHint].join(" ")}
      </p>
      <Markdown
        running={false}
        text={text}
        topHeadingLevel={PART_TOP_HEADING_LEVEL}
      />
    </section>
  );
}

// An editable field's hint: what the part does, then its limit, if it has
// one, and what {{name}} becomes.
function partHint({ help, maxLength }: PromptPartField): string {
  const limit: string[] = [];
  if (maxLength !== undefined) {
    limit.push(PROMPT_COPY.limit(maxLength));
  }
  return [help, ...limit, PROMPT_COPY.namePlaceholderHint].join(" ");
}

// The name field of her own prompt, and the most characters it may hold,
// if its kind limits it.
export function PromptNameField({
  name,
  maxLength,
}: {
  readonly name: string;
  readonly maxLength?: number;
}): JSX.Element {
  let hint: string | undefined;
  if (maxLength !== undefined) {
    hint = PROMPT_COPY.limit(maxLength);
  }
  return (
    <TextField
      defaultValue={name}
      hint={hint}
      label={PROMPT_COPY.nameLabel}
      maxLength={maxLength}
      name="name"
      required={true}
    />
  );
}

// Built-in parts render as Markdown. Own parts keep their source in fields
// of the surrounding save form, with reset buttons for PromptResetForms.
export function PromptPartFields({
  fields,
  editable,
}: {
  readonly fields: readonly PromptPartField[];
  readonly editable: boolean;
}): JSX.Element {
  return (
    <div className="panel flex min-w-0 flex-col gap-6">
      {fields.map((field) => {
        const { key, label, text, maxLength } = field;
        if (!editable) {
          return <ReadOnlyPart field={field} key={key} />;
        }
        return (
          <div className="flex flex-col gap-2" key={key}>
            <TextAreaField
              className="min-h-40 font-mono text-sm"
              defaultValue={text}
              hint={partHint(field)}
              label={label}
              maxLength={maxLength}
              name={key}
            />
            <Button
              aria-label={PROMPT_COPY.resetLabel(label)}
              className="self-start"
              form={resetFormId(key)}
              type="submit"
              variant="quiet"
            >
              {PROMPT_COPY.reset}
            </Button>
          </div>
        );
      })}
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
