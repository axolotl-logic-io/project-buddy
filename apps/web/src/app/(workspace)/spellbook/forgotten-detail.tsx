import type { JSX } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import type { RetiredDetail } from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { ForgottenSpellControls } from "./forgotten-controls.tsx";

function ForgottenSpellDetail({
  definition,
}: {
  readonly definition: RetiredDetail;
}): JSX.Element {
  return (
    <>
      <p className="text-muted">
        {RETIREMENT_COPY.kind[definition.kind]}
        {RETIREMENT_COPY.separator}
        {RETIREMENT_COPY.dateLabel}{" "}
        <LocalTime dateTime={definition.retiredAt} detail="day" />
      </p>
      <ForgottenSpellControls definition={definition} />
      <h2 className="section-heading">{RETIREMENT_COPY.instructions}</h2>
      {definition.texts.map((field) => (
        <PromptText
          editable={false}
          help=""
          key={field.name}
          label={RETIREMENT_COPY.fields[field.name]}
          name={field.name}
          text={field.text}
        />
      ))}
    </>
  );
}

export { ForgottenSpellDetail };
