import type { Metadata, Route } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";
import { HOME_PATH } from "@/routes.ts";
import { WORKSHOP_COPY, WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";
import { ActivityLists } from "../activities/activity-lists.tsx";
import { ConstructLists } from "../guild/construct-lists.tsx";
import { SpellLists } from "../spellbook/spell-lists.tsx";

const QUERY = z.object({
  kind: z.enum(PROMPT_KINDS).catch("construct"),
});

// The Workshop's address, showing the kind's tab.
function workshopPath(kind: PromptKind): Route {
  if (kind === "construct") {
    return "/workshop";
  }
  return `/workshop?kind=${kind}`;
}

// A link to each kind's tab, the shown one marked.
function KindTabs({ shown }: { readonly shown: PromptKind }): JSX.Element {
  return (
    <nav aria-label={WORKSHOP_PAGE_COPY.kindsLabel}>
      <ul className="flex flex-wrap gap-2">
        {PROMPT_KINDS.map((kind) => {
          let current: "page" | undefined;
          let variant: "secondary" | "quiet" = "quiet";
          if (kind === shown) {
            current = "page";
            variant = "secondary";
          }
          return (
            <li key={kind}>
              <Button asChild={true} variant={variant}>
                <Link aria-current={current} href={workshopPath(kind)}>
                  {WORKSHOP_PAGE_COPY.kinds[kind]}
                </Link>
              </Button>
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
  const { kind } = QUERY.parse(await searchParams);
  return (
    <>
      <BackLink href={HOME_PATH}>{WORKSHOP_PAGE_COPY.homeLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{WORKSHOP_COPY.heading}</h1>
        <p className="text-muted">{WORKSHOP_PAGE_COPY.intro}</p>
      </div>
      <KindTabs shown={kind} />
      {await kindLists(kind)}
    </>
  );
}
