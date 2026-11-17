import type { Metadata } from "next";
import type { JSX } from "react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { SpellLists } from "./spell-lists.tsx";

const metadata: Metadata = { title: SPELLBOOK_COPY.title };
async function SpellbookPage({
  searchParams,
}: PageProps<"/spellbook">): Promise<JSX.Element> {
  const { retired, restored, deleted, filter } = await searchParams;
  let initialFilter: string | undefined;
  if (typeof filter === "string") {
    initialFilter = filter;
  }
  return (
    <>
      <RetirementFeedback completed={retired === "1"} />
      {restored === "1" && (
        <Notice role="status">{RETIREMENT_COPY.restored}</Notice>
      )}
      {deleted === "1" && (
        <Notice role="status">{RETIREMENT_COPY.deleted}</Notice>
      )}
      {await SpellLists({ initialFilter })}
    </>
  );
}

export { metadata };
export default SpellbookPage;
