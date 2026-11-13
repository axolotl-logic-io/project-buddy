import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { getSpell, SPELL_ID } from "@/spells/spell.ts";
import { pageTitle } from "@/ui/copy/site.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

export async function generateMetadata({
  params,
}: PageProps<"/spellbook/[spellId]">): Promise<Metadata> {
  const parsed = SPELL_ID.safeParse((await params).spellId);
  if (!parsed.success) {
    notFound();
  }
  return { title: pageTitle(getSpell(parsed.data).name) };
}
export default async function SpellPage({
  params,
}: PageProps<"/spellbook/[spellId]">): Promise<JSX.Element> {
  await requireUser();
  const parsed = SPELL_ID.safeParse((await params).spellId);
  if (!parsed.success) {
    notFound();
  }
  const spell = getSpell(parsed.data);
  return (
    <section className="page-slot">
      <h2 className="section-heading">{spell.name}</h2>
      <p>{spell.description}</p>
      <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
    </section>
  );
}
