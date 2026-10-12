import type { JSX } from "react";
import { RadioCardGroup } from "@/components/ui/radio-card-group.tsx";
import { DEFAULT_PERSONA_ID, listPersonas } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

const PERSONA_OPTIONS = listPersonas().map((persona) => ({
  value: persona.id,
  label: persona.name,
}));

// A form's choice of persona, sent as `personaId`, with the default persona
// chosen to start with.
export function PersonaPicker(): JSX.Element {
  return (
    <RadioCardGroup
      defaultValue={DEFAULT_PERSONA_ID}
      label={COPY.newChat.personaLabel}
      name="personaId"
      options={PERSONA_OPTIONS}
    />
  );
}
