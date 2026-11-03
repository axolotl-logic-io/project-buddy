import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { HOME_PATH } from "@/routes.ts";
import { listSpells } from "@/spells/index.ts";
import type { SpellChoice } from "@/spells/spell-choice.ts";
import { listOwnSpells } from "@/spells/spell-store.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { cloneSpellAction, editBuiltInSpellAction } from "../actions.ts";
import { DeleteSpellForm } from "../delete-spell-form.tsx";

const BUILT_IN_HEADING_ID = "built-in-spells-heading";
const OWN_HEADING_ID = "own-spells-heading";

// A spell as a card: its name, which links to its page, when to use it,
// then its actions.
function SpellCard({
  spell,
  actions,
}: {
  readonly spell: SpellChoice;
  readonly actions: JSX.Element;
}): JSX.Element {
  return (
    <li className="card flex min-w-0 flex-col gap-2">
      <Link
        className="card-title wrap-anywhere text-link"
        href={`/spellbook/${spell.id}`}
      >
        {spell.name}
      </Link>
      <p className="wrap-anywhere text-muted text-sm">{spell.whenToUse}</p>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );
}

// The built-in spells as cards, each with a button that customizes it:
// makes a clone of their own and opens it to edit.
function BuiltInSpellCards({
  spells,
}: {
  readonly spells: readonly SpellChoice[];
}): JSX.Element {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {spells.map((spell) => (
        <SpellCard
          actions={
            <form action={editBuiltInSpellAction}>
              <input name="spellId" type="hidden" value={spell.id} />
              <Button
                aria-label={SPELLBOOK_COPY.customizeLabel(spell.name)}
                type="submit"
                variant="quiet"
              >
                {SPELLBOOK_COPY.customize}
              </Button>
            </form>
          }
          key={spell.id}
          spell={spell}
        />
      ))}
    </ul>
  );
}

// Their own spells as cards, each with a link that edits it in place, a
// button that clones it and one that deletes it; or, if they have none, a
// line that says so.
function OwnSpellCards({
  spells,
}: {
  readonly spells: readonly SpellChoice[];
}): JSX.Element {
  if (spells.length === 0) {
    return <p className="text-muted">{SPELLBOOK_COPY.noOwn}</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {spells.map((spell) => (
        <SpellCard
          actions={
            <>
              <Button asChild={true} variant="quiet">
                <Link
                  aria-label={SPELLBOOK_COPY.tweakLabel(spell.name)}
                  href={`/spellbook/${spell.id}`}
                >
                  {SPELLBOOK_COPY.tweak}
                </Link>
              </Button>
              <form action={cloneSpellAction}>
                <input name="sourceId" type="hidden" value={spell.id} />
                <Button
                  aria-label={SPELLBOOK_COPY.cloneLabel(spell.name)}
                  type="submit"
                  variant="quiet"
                >
                  {SPELLBOOK_COPY.clone}
                </Button>
              </form>
              <DeleteSpellForm name={spell.name} spellId={spell.id} />
            </>
          }
          key={spell.id}
          spell={spell}
        />
      ))}
    </ul>
  );
}

// A spell as its card shows it.
function asCard({
  id,
  name,
  parts,
}: {
  readonly id: string;
  readonly name: string;
  readonly parts: { readonly whenToUse: string };
}): SpellChoice {
  return { id, name, whenToUse: parts.whenToUse };
}

export const metadata: Metadata = { title: SPELLBOOK_COPY.title };

// The Spellbook: the built-in spells, each of which they can customize, and
// their own, oldest first, each of which they can edit, clone or delete.
export default async function SpellbookPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const own = await listOwnSpells(user.id);
  return (
    <>
      <BackLink href={HOME_PATH}>{SPELLBOOK_COPY.homeLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{SPELLBOOK_COPY.heading}</h1>
        <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
      </div>
      <section
        aria-labelledby={BUILT_IN_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={BUILT_IN_HEADING_ID}>
          {SPELLBOOK_COPY.builtInHeading}
        </h2>
        <BuiltInSpellCards spells={listSpells().map(asCard)} />
      </section>
      <section aria-labelledby={OWN_HEADING_ID} className="flex flex-col gap-4">
        <h2 className="section-heading" id={OWN_HEADING_ID}>
          {SPELLBOOK_COPY.ownHeading}
        </h2>
        <OwnSpellCards spells={own.map(asCard)} />
      </section>
    </>
  );
}
