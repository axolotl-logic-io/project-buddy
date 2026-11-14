import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { findSpell, getOwnSpell } from "@/spells/own-spell-store.ts";
import { getSpell, SPELL_ID } from "@/spells/spell.ts";
import {
  SPELL_REPLY_CHOICES_MAX,
  SPELL_REPLY_MAX,
  SPELL_RESPONSE_KEYS,
} from "@/spells/spell-definition.ts";
import { SPELL_DESTINATION_CHOICES } from "@/spells/spell-destination.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { pageTitle } from "@/ui/copy/site.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import {
  cloneSpellAction,
  retireSpellAction,
  saveSpellAction,
} from "../actions.ts";

async function generateMetadata({
  params,
}: PageProps<"/spellbook/[spellId]">): Promise<Metadata> {
  const user = await requireUser();
  const spell = await findSpell(user.id, (await params).spellId);
  return { title: pageTitle(spell?.name ?? SPELLBOOK_COPY.name) };
}
async function SpellPage({
  params,
  searchParams,
}: PageProps<"/spellbook/[spellId]">): Promise<JSX.Element> {
  const user = await requireUser();
  const { spellId } = await params;
  const builtin = SPELL_ID.safeParse(spellId);
  if (builtin.success) {
    const spell = getSpell(builtin.data);
    return (
      <Workshop kind="spell">
        <h2 className="section-heading">{spell.name}</h2>
        <p>{SPELLBOOK_COPY.builtIn}</p>
        <form action={cloneSpellAction}>
          <input name="spellId" type="hidden" value={spell.id} />
          <Button type="submit">{SPELLBOOK_COPY.customize}</Button>
        </form>
        <p>{spell.description}</p>
        {SPELL_RESPONSE_KEYS.map((field) => (
          <PromptText
            key={field}
            name={field}
            text={spell.definition[field]
              .map((reply) => `- ${reply}`)
              .join("\n")}
            label={SPELLBOOK_COPY.responses[field]}
            help={SPELLBOOK_COPY.responsesHelp}
            editable={false}
            maxLength={SPELL_REPLY_MAX}
          />
        ))}
      </Workshop>
    );
  }
  const spell = await getOwnSpell(user.id, spellId);
  if (spell === undefined) {
    const retired = await getRetiredDefinition(user.id, spellId);
    if (retired?.kind === "spell") {
      redirect(`/retirement/${retired.id}`);
    }
    notFound();
  }
  const { saved } = await searchParams;
  const revision = JSON.stringify([spell.name, spell.definition]);
  return (
    <Workshop kind="spell">
      <FormStatus>{saved === "1" && SPELLBOOK_COPY.saved}</FormStatus>
      <p className="wrap-anywhere text-muted">
        {SPELLBOOK_COPY.command(spell.name)}
      </p>
      <PromptEditor
        action={saveSpellAction}
        kind="spell"
        idName="spellId"
        promptId={spell.id}
        savedAt={revision}
        key={revision}
        name={spell.name}
        nameMaxLength={120}
        defaultPrompt={undefined}
        viewer={user.id}
        heading={SPELLBOOK_COPY.settings}
        texts={[
          ...SPELL_RESPONSE_KEYS.map((field) => ({
            name: field,
            text: JSON.stringify(spell.definition[field]),
            list: {
              maxLength: SPELL_REPLY_MAX,
              maxItems: SPELL_REPLY_CHOICES_MAX,
            },
            label: SPELLBOOK_COPY.responses[field],
            help: SPELLBOOK_COPY.responsesHelp,
            maxLength: SPELL_REPLY_MAX,
            literal: true,
            requiredMessage: SPELLBOOK_COPY.responseRequired,
          })),
          {
            name: "destination",
            placement: "under-name",
            text: spell.definition.destination,
            label: SPELLBOOK_COPY.destination,
            help: SPELLBOOK_COPY.destinationHelp,
            choices: SPELL_DESTINATION_CHOICES,
          },
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <form action={cloneSpellAction}>
          <input type="hidden" name="spellId" value={spell.id} />
          <Button type="submit" variant="secondary">
            {SPELLBOOK_COPY.copy}
          </Button>
        </form>
        <form action={retireSpellAction}>
          <input type="hidden" name="spellId" value={spell.id} />
          <Button type="submit" variant="quiet">
            {RETIREMENT_COPY.retire}
          </Button>
        </form>
      </div>
    </Workshop>
  );
}

export { generateMetadata };
export default SpellPage;
