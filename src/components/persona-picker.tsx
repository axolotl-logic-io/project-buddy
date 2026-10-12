import type { JSX } from "react";
import { RadioCardGroup } from "@/components/ui/radio-card-group.tsx";
import {
  DEFAULT_PERSONA_ID,
  listPersonas,
  type PersonaId,
} from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

const PERSONA_OPTIONS = listPersonas().map((persona) => ({
  value: persona.id,
  label: persona.name,
}));

// A form's choice of persona, sent as `personaId`, with defaultPersonaId,
// or else the default persona, chosen to start with.
export function PersonaPicker({
  defaultPersonaId = DEFAULT_PERSONA_ID,
}: {
  readonly defaultPersonaId?: PersonaId;
}): JSX.Element {
  return (
    <RadioCardGroup
      defaultValue={defaultPersonaId}
      label={COPY.newChat.personaLabel}
      name="personaId"
      options={PERSONA_OPTIONS}
    />
  );
}
