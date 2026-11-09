import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { SpellLists } from "../spell-lists.tsx";

export const metadata: Metadata = { title: SPELLBOOK_COPY.title };

export default async function SpellbookPage({
  searchParams,
}: PageProps<"/spellbook">): Promise<JSX.Element> {
  const { retired } = await searchParams;
  return (
    <>
      <RetirementFeedback completed={retired === "1"} />

      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{SPELLBOOK_COPY.heading}</h1>
        <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
      </div>
      <Link className="back-link" href="/retirement">
        {RETIREMENT_COPY.heading}
      </Link>
      {await SpellLists()}
    </>
  );
}
