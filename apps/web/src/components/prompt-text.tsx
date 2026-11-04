"use client";

import { type JSX, useId } from "react";
import { Markdown } from "@/components/markdown.tsx";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// One text of a built-in prompt, read-only: its label and hint, then the
// text as rendered Markdown, with literal placeholders such as {{name}}
// left in view. Her own prompts are edited in PromptEditor.
export function PromptText({
  text,
  label,
  help,
  maxLength,
}: {
  readonly text: string;
  readonly label: string;
  readonly help: string;
  readonly maxLength?: number;
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
        {PROMPT_COPY.textHint(help, maxLength)}
      </p>
      <Markdown running={false} text={text} topHeadingLevel={4} />
    </section>
  );
}
