import type { JSX } from "react";
import { DEFAULT_PERSONA_ID, listPersonas } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

// A form's choice of persona, sent as `personaId`, with the default persona
// chosen to start with.
export function PersonaPicker(): JSX.Element {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">{COPY.newChat.personaLabel}</legend>
      {listPersonas().map((persona) => (
        <label className="flex items-center gap-2" key={persona.id}>
          <input
            defaultChecked={persona.id === DEFAULT_PERSONA_ID}
            name="personaId"
            type="radio"
            value={persona.id}
          />
          {persona.name}
        </label>
      ))}
    </fieldset>
  );
}
