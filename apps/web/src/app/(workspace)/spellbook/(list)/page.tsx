import type { Metadata } from "next";
import type { JSX } from "react";
import { DeletionFeedback } from "@/components/deletion-feedback.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { SpellLists } from "../spell-lists.tsx";

export const metadata: Metadata = { title: SPELLBOOK_COPY.title };

export default async function SpellbookPage({
  searchParams,
}: PageProps<"/spellbook">): Promise<JSX.Element> {
  const { deleted } = await searchParams;
  return (
    <>
      <DeletionFeedback completed={deleted === "1"} />
      <BackLink href={HOME_PATH}>{SPELLBOOK_COPY.homeLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{SPELLBOOK_COPY.heading}</h1>
        <p className="text-muted">{SPELLBOOK_COPY.intro}</p>
      </div>
      {await SpellLists()}
    </>
  );
}
