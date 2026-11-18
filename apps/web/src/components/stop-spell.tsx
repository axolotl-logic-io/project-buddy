"use client";

import { type JSX, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import { changeQuestSpellAction } from "@/spells/quest-spell-action.ts";
import { SPELL_MODE_COPY } from "@/ui/copy/spells.ts";

function StopSpell({
  questId,
  name,
}: {
  readonly questId: QuestId;
  readonly name: string;
}): JSX.Element {
  const { run, busy, problem } = useQuestAction(changeQuestSpellAction);
  const stop = useCallback((): void => {
    run({ questId }).catch(() => undefined);
  }, [questId, run]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span>{SPELL_MODE_COPY.active(name)}</span>
      <Button variant="secondary" onClick={stop} disabled={busy}>
        {SPELL_MODE_COPY.stop(name)}
      </Button>
      {problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

export { StopSpell };
