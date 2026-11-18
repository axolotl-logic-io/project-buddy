"use client";

import { type JSX, type MouseEvent, useCallback } from "react";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { SPELL_MODE_COPY, SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

function SpellPicker({
  spells,
  activeSpell,
}: {
  readonly spells: readonly SpellSnapshot[];
  readonly activeSpell?: string | undefined;
}): JSX.Element {
  const { send, busy, problem } = usePanelSend();
  const toggleSpell = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const spell = spells.find(
        (item) => item.id === event.currentTarget.value,
      );
      if (spell === undefined) {
        return;
      }
      let command = PANEL_COMMAND.cast(spell.name);
      if (spell.id === activeSpell) {
        command = PANEL_COMMAND.stop;
      }
      send(command).catch(() => undefined);
    },
    [activeSpell, send, spells],
  );
  return (
    <>
      <ul className="divided-rows">
        {spells.map((spell) => {
          let label = SPELLBOOK_COPY.castLabel;
          let accessibleLabel = SPELLBOOK_COPY.castNamed(spell.name);
          if (spell.id === activeSpell) {
            label = SPELL_MODE_COPY.stopLabel;
            accessibleLabel = SPELL_MODE_COPY.stop(spell.name);
          }
          return (
            <li key={spell.id} className="flex flex-col gap-1 py-2">
              <div className="flex items-center justify-between gap-3">
                <strong className="wrap-anywhere min-w-0">{spell.name}</strong>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={accessibleLabel}
                  aria-busy={busy}
                  disabled={busy}
                  onClick={toggleSpell}
                  value={spell.id}
                >
                  {label}
                </Button>
              </div>
              <p className="text-muted">
                {SPELLBOOK_COPY.collectionDestination(
                  SPELLBOOK_COPY.destinations[spell.definition.destination],
                )}
              </p>
            </li>
          );
        })}
      </ul>
      {problem !== undefined && <Alert>{problem}</Alert>}
    </>
  );
}

export { SpellPicker };
