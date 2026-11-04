import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { DeletePromptForm } from "@/components/delete-prompt-form.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { ListingId } from "@/ids.ts";
import { listListedSources } from "@/marketplace/listing-store.ts";
import { HOME_PATH } from "@/routes.ts";
import { listSpells } from "@/spells/index.ts";
import type { SpellChoice } from "@/spells/spell-choice.ts";
import { listOwnSpells, type OwnSpell } from "@/spells/spell-store.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import {
  cloneSpellAction,
  deleteSpellAction,
  editBuiltInSpellAction,
  newSpellAction,
} from "../actions.ts";

const BUILT_IN_HEADING_ID = "built-in-spells-heading";
const OWN_HEADING_ID = "own-spells-heading";

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

// An own spell as a card: a choice, whether it was bought, and the listing
// it is listed as now, if it is.
interface OwnSpellCard extends SpellChoice {
  readonly bought: boolean;
  readonly listing: ListingId | undefined;
}

function OwnSpellCards({
  spells,
}: {
  readonly spells: readonly OwnSpellCard[];
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
              <DeletePromptForm
                action={deleteSpellAction}
                bought={spell.bought}
                kind="spell"
                listing={spell.listing}
                name={spell.name}
                promptId={spell.id}
              />
            </>
          }
          key={spell.id}
          spell={spell}
        />
      ))}
    </ul>
  );
}

function asCard({
  id,
  name,
  definition,
}: {
  readonly id: string;
  readonly name: string;
  readonly definition: { readonly whenToUse: string };
}): SpellChoice {
  return { id, name, whenToUse: definition.whenToUse };
}

function asOwnCard(
  spell: OwnSpell,
  listed: ReadonlyMap<string, ListingId>,
): OwnSpellCard {
  return {
    ...asCard(spell),
    bought: spell.boughtFrom !== undefined,
    listing: listed.get(spell.id),
  };
}

export const metadata: Metadata = { title: SPELLBOOK_COPY.title };

export default async function SpellbookPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [own, listed] = await Promise.all([
    listOwnSpells(user.id),
    listListedSources(user.id, "spell"),
  ]);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-heading" id={OWN_HEADING_ID}>
            {SPELLBOOK_COPY.ownHeading}
          </h2>
          <form action={newSpellAction}>
            <Button type="submit" variant="secondary">
              {SPELLBOOK_COPY.newSpell}
            </Button>
          </form>
        </div>
        <OwnSpellCards spells={own.map((spell) => asOwnCard(spell, listed))} />
      </section>
    </>
  );
}
