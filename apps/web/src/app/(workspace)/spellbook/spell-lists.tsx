import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { listOwnSpells } from "@/spells/own-spell-store.ts";
import { listSpells } from "@/spells/spell.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { newSpellAction } from "./actions.ts";
import { SpellIndex } from "./spell-index.tsx";

async function SpellLists(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnSpells(user.id);
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
      <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
      <form action={newSpellAction}>
        <Button type="submit">{SPELLBOOK_COPY.newSpell}</Button>
      </form>
      <SpellIndex entries={entries} />
      <p className="text-muted">{SPELLBOOK_COPY.help}</p>
      <Link href="/retirement" className="text-link">
        {RETIREMENT_COPY.heading}
      </Link>
    </section>
  );
}

export { SpellLists };
