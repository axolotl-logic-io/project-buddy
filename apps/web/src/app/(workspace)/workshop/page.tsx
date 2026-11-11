import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";
import { workshopPath } from "@/routes.ts";
import { WORKSHOP_COPY, WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";
import { ActivityLists } from "../activities/activity-lists.tsx";
import { ConstructLists } from "../constructs/construct-lists.tsx";
import { SpellLists } from "../spellbook/spell-lists.tsx";

const QUERY = z.object({
  kind: z.enum(PROMPT_KINDS).catch("construct"),
});

// A link to each kind's tab, the shown one marked, styled as the site's
// other tabs.
function KindTabs({ shown }: { readonly shown: PromptKind }): JSX.Element {
  return (
    <nav
      aria-label={WORKSHOP_PAGE_COPY.kindsLabel}
      className="border-line border-b"
    >
      <ul className="workspace-tablist">
        {PROMPT_KINDS.map((kind) => {
          let current: "page" | undefined;
          if (kind === shown) {
            current = "page";
          }
          return (
            <li key={kind}>
              <Link
                aria-current={current}
                className="workspace-tab"
                href={workshopPath(kind)}
              >
                {WORKSHOP_PAGE_COPY.kinds[kind]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// The kind's built-in ones and the user's own, each with its actions.
function kindLists(kind: PromptKind): Promise<JSX.Element> {
  if (kind === "activity") {
    return ActivityLists();
  }
  if (kind === "spell") {
    return SpellLists();
  }
  return ConstructLists();
}

export const metadata: Metadata = { title: WORKSHOP_COPY.title };

// Where the user makes, customizes, tweaks and clones constructs, activities
// and spells, one kind at a time. Each opens in its own Workshop to edit
// and test.
export default async function WorkshopPage({
  searchParams,
}: PageProps<"/workshop">): Promise<JSX.Element> {
  const query = await searchParams;
  const { kind } = QUERY.parse(query);
  return (
    <>
      <RetirementFeedback completed={query.retired === "1"} />
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{WORKSHOP_COPY.heading}</h1>
        <p className="text-muted">{WORKSHOP_PAGE_COPY.intro}</p>
      </div>
      <KindTabs shown={kind} />
      {await kindLists(kind)}
    </>
  );
}
