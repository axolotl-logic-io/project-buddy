import type { Metadata } from "next";
import type { JSX } from "react";
import { DeletionFeedback } from "@/components/deletion-feedback.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { BuddyLists } from "../buddy-lists.tsx";

export const metadata: Metadata = { title: BUDDIES_COPY.title };

// The built-in buddies and her own, each with its actions.
export default async function BuddiesPage({
  searchParams,
}: PageProps<"/buddies">): Promise<JSX.Element> {
  const { deleted } = await searchParams;
  return (
    <>
      <DeletionFeedback completed={deleted === "1"} />
      <BackLink href={HOME_PATH}>{BUDDIES_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{BUDDIES_COPY.heading}</h1>
      {await BuddyLists()}
    </>
  );
}
