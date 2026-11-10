// The spells list, shared by the Spellbook and the Workshop: the built-in
// spells, each of which she can customize, and her own, each of which she
// can tweak, clone or delete, with a button that crafts a new one.
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { Button } from "@/components/ui/button.tsx";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import {
  listedPromptIds,
  type SaleState,
} from "@/marketplace/listing-store.ts";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
import { listSpells } from "@/spells/index.ts";
import type { SpellChoice } from "@/spells/spell-choice.ts";
import { listOwnSpells } from "@/spells/spell-store.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { RetirementList } from "../retirement/retirement-list.tsx";
import {
  cloneSpellAction,
  editBuiltInSpellAction,
  newSpellAction,
} from "./actions.ts";
import { RetireSpellForm } from "./retire-spell-form.tsx";

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
      <div className="card-actions">{actions}</div>
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

interface OwnSpellCard extends SpellChoice {
  readonly sale: SaleState["kind"];
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
              <RetireSpellForm
                sale={spell.sale}
                name={spell.name}
                spellId={spell.id}
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

async function SpellLists({
  workspace = false,
}: {
  readonly workspace?: boolean;
} = {}): Promise<JSX.Element> {
  const user = await requireUser();
  const [own, listed] = await Promise.all([
    listOwnSpells(user.id),
    listedPromptIds(user.id, "spell"),
  ]);
  const cards = own.map((spell): OwnSpellCard => {
    let sale: SaleState["kind"] = "listable";
    if (listed.has(spell.id)) {
      sale = "listed";
    }
    if (spell.boughtFrom !== undefined) {
      sale = "bought";
    }
    return { ...asCard(spell), sale };
  });
  if (workspace === true) {
    const retired = await listRetiredDefinitions(user.id);
    return (
      <PageWorkspace
        title={SPELLBOOK_COPY.heading}
        intro={SPELLBOOK_COPY.intro}
        action={
          <form action={newSpellAction}>
            <Button type="submit">{SPELLBOOK_COPY.newSpell}</Button>
          </form>
        }
      >
        <WorkspaceTabs
          label={SPELLBOOK_COPY.heading}
          sections={[
            {
              id: "built-in",
              label: WORKSPACES_COPY.builtIn,
              content: (
                <div className="workspace-rows">
                  <BuiltInSpellCards spells={listSpells().map(asCard)} />
                </div>
              ),
            },
            {
              id: "yours",
              label: WORKSPACES_COPY.yours,
              content: (
                <div className="workspace-rows">
                  <OwnSpellCards spells={cards} />
                </div>
              ),
            },
            {
              id: "retired",
              label: WORKSPACES_COPY.retired,
              content: (
                <div className="flex flex-col gap-4">
                  <RetirementList
                    definitions={retired.filter(
                      (definition) => definition.kind === "spell",
                    )}
                  />
                </div>
              ),
            },
          ]}
        />
      </PageWorkspace>
    );
  }
  return (
    <>
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
        <OwnSpellCards spells={cards} />
      </section>
    </>
  );
}

export { SpellLists };
