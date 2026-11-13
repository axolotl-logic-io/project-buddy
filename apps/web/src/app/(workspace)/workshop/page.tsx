import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { workshopPath } from "@/routes.ts";
import { WORKSHOP_COPY, WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";
import { ConstructLists } from "../constructs/construct-lists.tsx";
import { SpellLists } from "../spellbook/spell-lists.tsx";

const WORKSHOP_KINDS = ["construct", "spell"] as const;

const QUERY = z.object({
  kind: z.enum(WORKSHOP_KINDS).catch("construct"),
  retired: z.literal("1").optional().catch(undefined),
});

// A link to each kind's tab, the shown one marked, styled as the site's
// other tabs. These query variants share a route. Prefetching them with
// partial prefetching repeatedly requests a variant on Next 16.4.3; load
// the selected kind when its link is followed instead.
function KindTabs({
  shown,
}: {
  readonly shown: "construct" | "spell";
}): JSX.Element {
  return (
    <nav
      aria-label={WORKSHOP_PAGE_COPY.kindsLabel}
      className="border-line border-b"
    >
      <ul className="workspace-tablist">
        {WORKSHOP_KINDS.map((kind) => {
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
                prefetch={false}
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
function kindLists(kind: "construct" | "spell"): Promise<JSX.Element> {
  if (kind === "spell") {
    return SpellLists();
  }
  return ConstructLists();
}

export const metadata: Metadata = { title: WORKSHOP_COPY.title };

// The single collection for creating, copying and editing private definitions.
// Built-in instructions open read-only; Make a copy opens the shared editor.
export default async function WorkshopPage({
  searchParams,
}: PageProps<"/workshop">): Promise<JSX.Element> {
  const { kind, retired } = QUERY.parse(await searchParams);
  return (
    <>
      <RetirementFeedback completed={retired === "1"} />
      <p className="text-muted">{WORKSHOP_PAGE_COPY.intro}</p>
      <KindTabs shown={kind} />
      {await kindLists(kind)}
    </>
  );
}
