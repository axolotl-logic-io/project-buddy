import type { Metadata } from "next";
import type { JSX } from "react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
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
      {await ConstructLists({ workspace: true })}
    </>
  );
}
