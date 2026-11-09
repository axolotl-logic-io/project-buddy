"use client";

import dynamic from "next/dynamic";
import { type JSX, useId } from "react";

import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

const Markdown = dynamic(() =>
  import("@/components/markdown-content.tsx").then((module) => module.Markdown),
);

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

// Shared Markdown/source rendering; each page names its own concrete fields.
export function PromptText({
  text,
  label,
  help,
  name,
  editable,
  maxLength,
}: {
  readonly text: string;
  readonly label: string;
  readonly help: string;
  readonly name: string;
  readonly editable: boolean;
  readonly maxLength?: number;
}): JSX.Element {
  const id = useId();
  const headingId = `${id}-heading`;
  const helpId = `${id}-help`;
  const hints = [help, PROMPT_COPY.namePlaceholderHint];
  if (maxLength !== undefined) {
    hints.push(PROMPT_COPY.limit(maxLength));
  }
  const hint = hints.join(" ");
  if (editable) {
    return (
      <TextAreaField
        className="min-h-40 font-mono text-sm"
        defaultValue={text}
        hint={hint}
        label={label}
        maxLength={maxLength}
        name={name}
      />
    );
  }
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
        {hint}
      </p>
      <Markdown running={false} text={text} topHeadingLevel={4} />
    </section>
  );
}
