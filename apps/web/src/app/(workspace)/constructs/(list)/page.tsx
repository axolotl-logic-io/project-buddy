import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { ConstructLists } from "../construct-lists.tsx";

export const metadata: Metadata = { title: CONSTRUCTS_COPY.title };

// The Constructs: the built-in constructs and her own, each with its actions.
export default async function ConstructsPage({
  searchParams,
}: PageProps<"/constructs">): Promise<JSX.Element> {
  const { retired } = await searchParams;
  return (
    <>
      <RetirementFeedback completed={retired === "1"} />
      <BackLink href={HOME_PATH}>{CONSTRUCTS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{CONSTRUCTS_COPY.heading}</h1>
      <p className="text-muted">{CONSTRUCTS_COPY.intro}</p>
      <Link className="back-link" href="/retirement">
        {RETIREMENT_COPY.heading}
      </Link>
      {await ConstructLists()}
    </>
  );
}
