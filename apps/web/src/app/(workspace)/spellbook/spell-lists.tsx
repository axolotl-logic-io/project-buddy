import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
import { listOwnSpells } from "@/spells/own-spell-store.ts";
import { listSpells } from "@/spells/spell.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { newSpellAction } from "./actions.ts";
import { ForgottenSpellList } from "./forgotten-list.tsx";
import { SpellIndex } from "./spell-index.tsx";

async function SpellLists({
  initialFilter,
}: {
  readonly initialFilter?: string | undefined;
} = {}): Promise<JSX.Element> {
  const user = await requireUser();
  const [own, forgotten] = await Promise.all([
    listOwnSpells(user.id),
    listRetiredDefinitions(user.id),
  ]);
  const entries = [
    ...listSpells().map((spell) => ({
      id: spell.id,
      name: spell.name,
      destination: spell.definition.destination,
      builtIn: true,
    })),
    ...own.map((spell) => ({
      id: spell.id,
      name: spell.name,
      destination: spell.definition.destination,
      builtIn: false,
    })),
  ];
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
        <form action={newSpellAction}>
          <Button type="submit">{SPELLBOOK_COPY.newSpell}</Button>
        </form>
      </div>
      <SpellIndex
        entries={entries}
        initialFilter={initialFilter}
        forgottenCount={forgotten.length}
        forgotten={<ForgottenSpellList definitions={forgotten} />}
      />
      <p className="text-muted">{SPELLBOOK_COPY.help}</p>
    </section>
  );
}

export { SpellLists };
