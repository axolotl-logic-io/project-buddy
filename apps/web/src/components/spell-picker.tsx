"use client";

import { type JSX, type SubmitEvent, useCallback } from "react";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

// Casts the chosen spell by sending "cast" and its name to the quest's
// conversation, as if typed there; the spell's cast reply answers, and a
// spell already active gives way to it.
function SpellPicker({
  spells,
}: {
  readonly spells: readonly SpellSnapshot[];
}): JSX.Element {
  const { send, busy, problem } = usePanelSend();
  const cast = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const chosen = new FormData(event.currentTarget).get("spellId");
      const spell = spells.find((candidate) => candidate.id === chosen);
      if (spell === undefined) {
        return;
      }
      send(PANEL_COMMAND.cast(spell.name)).catch(() => undefined);
    },
    [send, spells],
  );
  return (
    <form className="flex flex-col gap-2" onSubmit={cast}>
      <SelectField
        name="spellId"
        label={SPELLBOOK_COPY.choose}
        defaultValue=""
        required={true}
      >
        <option value="" disabled={true}>
          {SPELLBOOK_COPY.choose}
        </option>
        {spells.map((spell) => (
          <option key={spell.id} value={spell.id}>
            {spell.name}
          </option>
        ))}
      </SelectField>
      <Button
        type="submit"
        variant="secondary"
        aria-busy={busy}
        disabled={busy}
      >
        {SPELLBOOK_COPY.cast}
      </Button>
      {problem !== undefined && <Alert>{problem}</Alert>}
    </form>
  );
}

export { SpellPicker };
