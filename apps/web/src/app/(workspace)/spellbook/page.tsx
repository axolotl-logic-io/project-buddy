import type { Metadata } from "next";
import type { JSX } from "react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { SpellLists } from "./spell-lists.tsx";

const metadata: Metadata = { title: SPELLBOOK_COPY.title };
async function SpellbookPage({
  searchParams,
}: PageProps<"/spellbook">): Promise<JSX.Element> {
  const { retired } = await searchParams;
  return (
    <>
      <RetirementFeedback completed={retired === "1"} />
      {await SpellLists()}
    </>
  );
}

export { metadata };
export default SpellbookPage;
