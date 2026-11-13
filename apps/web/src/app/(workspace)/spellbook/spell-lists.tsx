import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { listSpells } from "@/spells/spell.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

async function SpellLists(): Promise<JSX.Element> {
  await requireUser();
  return (
    <section className="flex flex-col gap-4">
      <h2 className="section-heading">{SPELLBOOK_COPY.builtInHeading}</h2>
      <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
      <ul className="definition-grid">
        {listSpells().map((spell) => (
          <li key={spell.id} className="card flex min-w-0 flex-col gap-2">
            <Link
              className="card-title wrap-anywhere text-link"
              href={`/spellbook/${spell.id}`}
            >
              {spell.name}
            </Link>
            <p className="wrap-anywhere text-muted text-sm">
              {spell.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { SpellLists };
