"use client";

import type { JSX } from "react";
import { useFormStatus } from "react-dom";
import { castSpellAction } from "@/app/(workspace)/spellbook/actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import type { ChatId } from "@/ids.ts";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

function CastButton(): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {SPELLBOOK_COPY.cast}
    </Button>
  );
}
function SpellPicker({
  chatId,
  spells,
}: {
  readonly chatId: ChatId;
  readonly spells: readonly SpellSnapshot[];
}): JSX.Element {
  return (
    <form action={castSpellAction} className="flex flex-col gap-2">
      <input type="hidden" name="chatId" value={chatId} />
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
      <CastButton />
    </form>
  );
}

export { SpellPicker };
