import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { SellSection } from "@/app/(workspace)/marketplace/sell-section.tsx";
import { requireUser } from "@/auth/current-user.ts";
import { DeletePromptForm } from "@/components/delete-prompt-form.tsx";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { listedAs } from "@/marketplace/listed-as.ts";
import { readSaleState, type SaleState } from "@/marketplace/listing-store.ts";
import { defaultSpellPrompt } from "@/spells/default-prompt.ts";
import { getSpell, isSpellId, type Spell } from "@/spells/index.ts";
import { SPELL_NAME_MAX, SPELL_TEXT_MAX } from "@/spells/spell.ts";
import { getOwnSpell, type OwnSpell } from "@/spells/spell-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  SPELL_COPY,
  SPELL_DEFINITION_COPY,
  SPELLBOOK_COPY,
} from "@/ui/copy/spells.ts";
import {
  deleteSpellAction,
  editBuiltInSpellAction,
  saveSpellAction,
} from "../actions.ts";

const PROMPT_HEADING_ID = "spell-parts-heading";

function SpellHeading({
  name,
  intro,
}: {
  readonly name: string;
  readonly intro: string;
}): JSX.Element {
  return (
    <>
      <BackLink href="/spellbook">{SPELL_COPY.spellbookLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{name}</h1>
        <p className="text-muted">{intro}</p>
      </div>
    </>
  );
}

function BuiltInSpell({ spell }: { readonly spell: Spell }): JSX.Element {
  return (
    <>
      <SpellHeading intro={SPELL_COPY.builtInIntro} name={spell.name} />
      <form action={editBuiltInSpellAction}>
        <input name="spellId" type="hidden" value={spell.id} />
        <Button type="submit">{SPELLBOOK_COPY.customize}</Button>
      </form>
      <section
        aria-labelledby={PROMPT_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={PROMPT_HEADING_ID}>
          {PROMPT_COPY.promptHeading}
        </h2>
        <PromptText
          text={spell.definition.whenToUse}
          {...SPELL_DEFINITION_COPY.whenToUse}
          maxLength={SPELL_TEXT_MAX.whenToUse}
        />
        <PromptText
          text={spell.definition.prompt}
          {...SPELL_DEFINITION_COPY.prompt}
          maxLength={SPELL_TEXT_MAX.prompt}
        />
      </section>
    </>
  );
}

function OwnSpellForm({
  spell,
  sale,
}: {
  readonly spell: OwnSpell;
  readonly sale: SaleState;
}): JSX.Element {
  return (
    <>
      <SpellHeading intro={SPELL_COPY.ownIntro} name={spell.name} />
      <PromptEditor
        action={saveSpellAction}
        defaultPrompt={defaultSpellPrompt(spell.clonedFrom)}
        idName="spellId"
        key={spell.updatedAt.toISOString()}
        kind="spell"
        name={spell.name}
        nameMaxLength={SPELL_NAME_MAX}
        promptId={spell.id}
        savedAt={spell.updatedAt.toISOString()}
        texts={[
          {
            name: "whenToUse",
            text: spell.definition.whenToUse,
            ...SPELL_DEFINITION_COPY.whenToUse,
            maxLength: SPELL_TEXT_MAX.whenToUse,
          },
          {
            name: "prompt",
            text: spell.definition.prompt,
            ...SPELL_DEFINITION_COPY.prompt,
            maxLength: SPELL_TEXT_MAX.prompt,
          },
        ]}
      />
      <DeletePromptForm
        action={deleteSpellAction}
        bought={spell.boughtFrom !== undefined}
        kind="spell"
        listing={listedAs(sale)}
        name={spell.name}
        promptId={spell.id}
      />
      <SellSection kind="spell" promptId={spell.id} sale={sale} />
    </>
  );
}

export const metadata: Metadata = { title: SPELL_COPY.title };

export default async function SpellPage({
  params,
}: PageProps<"/spellbook/[spellId]">): Promise<JSX.Element> {
  const { spellId } = await params;
  const user = await requireUser();
  if (isSpellId(spellId)) {
    return <BuiltInSpell spell={getSpell(spellId)} />;
  }
  const spell = await getOwnSpell(user.id, spellId);
  if (spell === undefined) {
    notFound();
  }
  const sale = await readSaleState(user.id, {
    kind: "spell",
    promptId: spell.id,
  });
  return <OwnSpellForm spell={spell} sale={sale} />;
}
