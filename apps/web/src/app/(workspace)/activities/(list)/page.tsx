import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { ActivityLists } from "../activity-lists.tsx";

export const metadata: Metadata = { title: ACTIVITIES_COPY.title };

// The built-in activities and her own, each with its actions.
export default async function ActivitiesPage({
  searchParams,
}: PageProps<"/activities">): Promise<JSX.Element> {
  const { retired } = await searchParams;
  return (
    <>
      <RetirementFeedback completed={retired === "1"} />
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{ACTIVITIES_COPY.heading}</h1>
        <p className="text-muted">{ACTIVITIES_COPY.intro}</p>
      </div>
      <Link className="back-link" href="/retirement">
        {RETIREMENT_COPY.heading}
      </Link>
      {await ActivityLists()}
    </>
  );
}
