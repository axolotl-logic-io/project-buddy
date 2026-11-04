import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { SellSection } from "@/app/(workspace)/marketplace/sell-section.tsx";
import { requireUser } from "@/auth/current-user.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { readSaleState, type SaleState } from "@/marketplace/listing-store.ts";
import { spellResetPrompt } from "@/spells/default-prompt.ts";
import { getSpell, isSpellId, type Spell } from "@/spells/index.ts";
import { SPELL_NAME_MAX, SPELL_TEXT_MAX } from "@/spells/spell.ts";
import { getOwnSpell, type OwnSpell } from "@/spells/spell-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import {
  SPELL_COPY,
  SPELL_DEFINITION_COPY,
  SPELLBOOK_COPY,
} from "@/ui/copy/spells.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import { workshopOptions } from "@/workshop/options.ts";
import { editBuiltInSpellAction, saveSpellAction } from "../actions.ts";
import { DeleteSpellForm } from "../delete-spell-form.tsx";

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
        <h2 className="section-heading wrap-anywhere">{name}</h2>
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
          {PROMPT_COPY.spellFieldsHeading}
        </h2>
        <PromptText
          editable={false}
          name="whenToUse"
          text={spell.definition.whenToUse}
          {...SPELL_DEFINITION_COPY.whenToUse}
          maxLength={SPELL_TEXT_MAX.whenToUse}
        />
        <PromptText
          editable={false}
          name="prompt"
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
  viewer,
}: {
  readonly spell: OwnSpell;
  readonly sale: SaleState;
  readonly viewer: string;
}): JSX.Element {
  return (
    <>
      <SpellHeading intro={SPELL_COPY.ownIntro} name={spell.name} />
      <PromptEditor
        action={saveSpellAction}
        defaultPrompt={
          (spell.boughtFrom === undefined &&
            spellResetPrompt(spell.clonedFrom).prompt) ||
          undefined
        }
        heading={PROMPT_COPY.spellFieldsHeading}
        idName="spellId"
        key={spell.updatedAt.toISOString()}
        kind="spell"
        name={spell.name}
        nameMaxLength={SPELL_NAME_MAX}
        promptId={spell.id}
        savedAt={spell.updatedAt.toISOString()}
        viewer={viewer}
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
      {spell.boughtFrom !== undefined && (
        <p className="text-muted">{PROMPT_COPY.boughtResetHint}</p>
      )}
      <DeleteSpellForm sale={sale.kind} name={spell.name} spellId={spell.id} />
      <SellSection kind="spell" promptId={spell.id} sale={sale} />
    </>
  );
}

export const metadata: Metadata = { title: WORKSHOP_COPY.title };

export default async function SpellPage({
  params,
}: PageProps<"/spellbook/[spellId]">): Promise<JSX.Element> {
  const { spellId } = await params;
  const user = await requireUser();
  const options = await workshopOptions(user.id);
  if (isSpellId(spellId)) {
    const spell = getSpell(spellId);
    return (
      <Workshop
        options={options}
        initial={{
          kind: "spell",
          id: spell.id,
          name: spell.name,
          prompt: spell.definition.prompt,
          whenToUse: spell.definition.whenToUse,
          openingRequest: "",
        }}
      >
        <BuiltInSpell spell={spell} />
      </Workshop>
    );
  }
  const spell = await getOwnSpell(user.id, spellId);
  if (spell === undefined) {
    notFound();
  }
  const sale = await readSaleState(user.id, {
    kind: "spell",
    promptId: spell.id,
  });
  return (
    <Workshop
      options={options}
      initial={{
        kind: "spell",
        id: spell.id,
        name: spell.name,
        prompt: spell.definition.prompt,
        whenToUse: spell.definition.whenToUse,
        openingRequest: "",
      }}
    >
      <OwnSpellForm viewer={user.id} spell={spell} sale={sale} />
    </Workshop>
  );
}
