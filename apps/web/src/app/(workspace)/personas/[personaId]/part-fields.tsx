"use client";

// The persona page's fields, rendered in the browser, where useId gives
// each field's label the id of its own control.
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { extraTag } from "@/flags/flags.ts";
import type { PersonaParts } from "@/personas/index.ts";
import {
  isMechanicsPart,
  PERSONA_PART_KEYS,
  type PersonaPartKey,
  SYSTEM_PROMPT_PARTS,
} from "@/personas/part-defaults.ts";
import { PERSONA_COPY, PERSONA_PARTS_COPY } from "@/ui/copy/personas.ts";
import { resetPersonaPartAction } from "../actions.ts";

// The id of the form that resets this part, outside the form that saves the
// parts, since forms don't nest.
function resetFormId(key: PersonaPartKey): string {
  return `reset-${key}`;
}

// What the part does, for a part of the system prompt that {{name}} becomes
// her name, and for a mechanics part, what an edit can break.
function partHint(key: PersonaPartKey): string {
  const hint = [PERSONA_PARTS_COPY[key].help];
  if (SYSTEM_PROMPT_PARTS.has(key)) {
    hint.push(PERSONA_COPY.namePlaceholderHint);
  }
  if (isMechanicsPart(key)) {
    hint.push(PERSONA_COPY.mechanicsWarning);
  }
  return hint.join(" ");
}

// The tag that puts a mechanics part, with its reset, in the
// persona-mechanics extra, which Settings hides by default; other parts
// carry none. Hiding is display only, so a hidden part is still saved.
function partTag(key: PersonaPartKey): ReturnType<typeof extraTag> | object {
  if (isMechanicsPart(key)) {
    return extraTag("persona-mechanics");
  }
  return {};
}

// The name field of her own persona.
export function NameField({ name }: { readonly name: string }): JSX.Element {
  return (
    <TextField
      defaultValue={name}
      label={PERSONA_COPY.nameLabel}
      name="name"
      required={true}
    />
  );
}

// Every part of a persona as a labelled textarea, in the page's order. Each
// part of her own persona is a field of the form around it, with a button
// that resets the part through its own form (ResetPartForms); a built-in
// persona's parts are read-only. A mechanics part is the persona-mechanics
// extra: hidden by display only, so its field is still saved unchanged.
export function PartFields({
  parts,
  editable,
}: {
  readonly parts: PersonaParts;
  readonly editable: boolean;
}): JSX.Element {
  return (
    <div className="panel flex flex-col gap-6">
      {PERSONA_PART_KEYS.map((key) => (
        <div className="flex flex-col gap-2" key={key} {...partTag(key)}>
          <TextAreaField
            className="min-h-40 font-mono text-sm"
            defaultValue={parts[key]}
            hint={partHint(key)}
            label={PERSONA_PARTS_COPY[key].label}
            name={key}
            readOnly={!editable}
          />
          {editable === true && (
            <Button
              aria-label={PERSONA_COPY.resetLabel(
                PERSONA_PARTS_COPY[key].label,
              )}
              className="self-start"
              form={resetFormId(key)}
              type="submit"
              variant="quiet"
            >
              {PERSONA_COPY.reset}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// The forms that reset each part of her persona, which PartFields' buttons
// submit. They show nothing.
export function ResetPartForms({
  personaId,
}: {
  readonly personaId: string;
}): JSX.Element {
  return (
    <div hidden={true}>
      {PERSONA_PART_KEYS.map((key) => (
        <form action={resetPersonaPartAction} id={resetFormId(key)} key={key}>
          <input name="personaId" type="hidden" value={personaId} />
          <input name="part" type="hidden" value={key} />
        </form>
      ))}
    </div>
  );
}
