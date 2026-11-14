import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { listOwnSpells } from "@/spells/own-spell-store.ts";
import { listSpells } from "@/spells/spell.ts";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { spellDestinationLabel } from "@/spells/spell-destination.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { cloneSpellAction, newSpellAction } from "./actions.ts";

function SpellCard({ spell }: { readonly spell: SpellSnapshot }): JSX.Element {
  const destination = spellDestinationLabel(spell.definition.destination);
  return (
    <li className="card flex min-w-0 flex-col gap-2">
      <Link
        className="card-title wrap-anywhere text-link"
        href={`/spellbook/${spell.id}`}
      >
        {spell.name}
      </Link>
      <p className="text-muted">
        {SPELLBOOK_COPY.destinationLabel(destination)}
      </p>
      <form action={cloneSpellAction}>
        <input type="hidden" name="spellId" value={spell.id} />
        <Button type="submit" variant="secondary">
          {SPELLBOOK_COPY.customize}
        </Button>
      </form>
    </li>
  );
}
async function SpellLists(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnSpells(user.id);
  return (
    <section className="flex flex-col gap-4">
      <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
      <form action={newSpellAction}>
        <Button type="submit">{SPELLBOOK_COPY.newSpell}</Button>
      </form>
      <h2 className="section-heading">{SPELLBOOK_COPY.builtInHeading}</h2>
      <ul className="definition-grid">
        {listSpells().map((spell) => (
          <SpellCard key={spell.id} spell={spell} />
        ))}
      </ul>
      <h2 className="section-heading">{SPELLBOOK_COPY.ownHeading}</h2>
      <ul className="definition-grid">
        {own.map((spell) => (
          <SpellCard key={spell.id} spell={spell} />
        ))}
      </ul>
    </section>
  );
}

export { SpellLists };
