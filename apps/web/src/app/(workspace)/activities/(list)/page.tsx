import type { Metadata } from "next";
import type { JSX } from "react";
import { DeletionFeedback } from "@/components/deletion-feedback.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { ActivityLists } from "../activity-lists.tsx";

export const metadata: Metadata = { title: ACTIVITIES_COPY.title };

// The built-in activities and her own, each with its actions.
export default async function ActivitiesPage({
  searchParams,
}: PageProps<"/activities">): Promise<JSX.Element> {
  const { deleted } = await searchParams;
  return (
    <>
      <DeletionFeedback completed={deleted === "1"} />
      <BackLink href={HOME_PATH}>{ACTIVITIES_COPY.homeLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{ACTIVITIES_COPY.heading}</h1>
        <p className="text-muted">{ACTIVITIES_COPY.intro}</p>
      </div>
      {await ActivityLists()}
    </>
  );
}
