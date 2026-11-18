"use client";

import { type JSX, type MouseEvent, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import { changeQuestSpellAction } from "@/spells/quest-spell-action.ts";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

function SpellPicker({
  questId,
  spells,
  activeSpell,
}: {
  readonly questId: QuestId;
  readonly spells: readonly SpellSnapshot[];
  readonly activeSpell?: SpellSnapshot | undefined;
}): JSX.Element {
  const { run, busy, problem } = useQuestAction(changeQuestSpellAction);
  const toggleSpell = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const spell = spells.find(
        (item) => item.id === event.currentTarget.value,
      );
      if (spell === undefined) {
        return;
      }
      run({ questId, spell: spell.id }).catch(() => undefined);
    },
    [questId, run, spells],
  );
  return (
    <>
      <ul className="divided-rows">
        {spells.map((spell) => (
          <li key={spell.id} className="flex flex-col gap-1 py-2">
            <div className="flex items-center justify-between gap-3">
              <strong className="wrap-anywhere min-w-0">{spell.name}</strong>
              {spell.id === activeSpell?.id && (
                <span>{SPELLBOOK_COPY.activeLabel}</span>
              )}
              {spell.id !== activeSpell?.id && (
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={SPELLBOOK_COPY.castNamed(spell.name)}
                  aria-busy={busy}
                  disabled={busy}
                  onClick={toggleSpell}
                  value={spell.id}
                >
                  {SPELLBOOK_COPY.castLabel}
                </Button>
              )}
            </div>
            <p className="text-muted">
              {SPELLBOOK_COPY.collectionDestination(
                SPELLBOOK_COPY.destinations[spell.definition.destination],
              )}
            </p>
          </li>
        ))}
      </ul>
      {problem !== undefined && <Alert>{problem}</Alert>}
    </>
  );
}

export { SpellPicker };
