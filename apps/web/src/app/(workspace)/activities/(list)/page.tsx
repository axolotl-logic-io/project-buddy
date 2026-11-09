import type { Metadata } from "next";
import type { JSX } from "react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
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
      {await ActivityLists({ workspace: true })}
    </>
  );
}
