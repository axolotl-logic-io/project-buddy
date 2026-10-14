import type { JSX } from "react";
import { RadioCardGroup } from "@/components/ui/radio-card-group.tsx";
import type { UserPersonaId } from "@/ids.ts";
import {
  DEFAULT_PERSONA_ID,
  listPersonas,
  type PersonaId,
} from "@/personas/index.ts";
import type { OwnPersonaChoice } from "@/personas/persona-store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const PERSONA_OPTIONS = listPersonas().map((persona) => ({
  value: persona.id,
  label: persona.name,
}));

const NO_USER_PERSONAS: readonly OwnPersonaChoice[] = [];

// A form's choice of persona, sent as `personaId`: the built-in personas,
// then any of the user's own given, with defaultPersonaId, or else the
// default persona, chosen to start with.
function PersonaPicker({
  defaultPersonaId = DEFAULT_PERSONA_ID,
  userPersonas = NO_USER_PERSONAS,
  label = NEW_CHAT_COPY.personaLabel,
}: {
  readonly defaultPersonaId?: PersonaId | UserPersonaId;
  readonly userPersonas?: readonly OwnPersonaChoice[];
  readonly label?: string;
}): JSX.Element {
  return (
    <RadioCardGroup
      defaultValue={defaultPersonaId}
      label={label}
      name="personaId"
      options={[
        ...PERSONA_OPTIONS,
        ...userPersonas.map(({ id, name }) => ({ value: id, label: name })),
      ]}
    />
  );
}

export { PersonaPicker };
