import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import {
  PromptNameField,
  PromptPartFields,
  PromptResetForms,
} from "@/components/prompt-part-fields.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getSpell, isSpellId, type Spell } from "@/spells/index.ts";
import { SPELL_PART_KEYS } from "@/spells/part-defaults.ts";
import { SPELL_NAME_MAX } from "@/spells/spell.ts";
import { getOwnSpell, type OwnSpell } from "@/spells/spell-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { SPELL_COPY, SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import {
  editBuiltInSpellAction,
  resetSpellPartAction,
  saveSpellAction,
} from "../actions.ts";
import { DeleteSpellForm } from "../delete-spell-form.tsx";
import { spellPartFields } from "./part-fields.ts";

const PARTS_HEADING_ID = "spell-parts-heading";

// The page's heading and the line under it.
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
        <h1 className="page-heading wrap-anywhere">{name}</h1>
        <p className="text-muted">{intro}</p>
      </div>
    </>
  );
}

// A built-in spell, every part read-only, with a button that customizes
// it: makes a copy of their own and opens it to edit.
function BuiltInSpell({ spell }: { readonly spell: Spell }): JSX.Element {
  return (
    <>
      <SpellHeading intro={SPELL_COPY.builtInIntro} name={spell.name} />
      <form action={editBuiltInSpellAction}>
        <input name="spellId" type="hidden" value={spell.id} />
        <Button type="submit">{SPELLBOOK_COPY.customize}</Button>
      </form>
      <section
        aria-labelledby={PARTS_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {PROMPT_COPY.partsHeading}
        </h2>
        <PromptPartFields
          editable={false}
          fields={spellPartFields(spell.parts)}
        />
      </section>
    </>
  );
}

// Their own spell as a form that saves its name and every part, within
// their limits, and a button that deletes it. The form starts afresh
// whenever the spell changes, so it shows what was saved.
function OwnSpellForm({ spell }: { readonly spell: OwnSpell }): JSX.Element {
  return (
    <>
      <SpellHeading intro={SPELL_COPY.ownIntro} name={spell.name} />
      <form
        action={saveSpellAction}
        className="flex flex-col gap-4"
        key={spell.updatedAt.toISOString()}
      >
        <input name="spellId" type="hidden" value={spell.id} />
        <div className="panel">
          <PromptNameField maxLength={SPELL_NAME_MAX} name={spell.name} />
        </div>
        <h2 className="section-heading" id={PARTS_HEADING_ID}>
          {PROMPT_COPY.partsHeading}
        </h2>
        <PromptPartFields
          editable={true}
          fields={spellPartFields(spell.parts)}
        />
        <Button className="self-start" type="submit">
          {PROMPT_COPY.save}
        </Button>
      </form>
      <PromptResetForms
        action={resetSpellPartAction}
        id={spell.id}
        idField="spellId"
        keys={SPELL_PART_KEYS}
      />
      <DeleteSpellForm name={spell.name} spellId={spell.id} />
    </>
  );
}

export const metadata: Metadata = { title: SPELL_COPY.title };

// A spell's prompt as named parts: a built-in spell's read-only, their own
// to edit or delete. Another user's spell, or an unknown id, is not found.
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
  return <OwnSpellForm spell={spell} />;
}
