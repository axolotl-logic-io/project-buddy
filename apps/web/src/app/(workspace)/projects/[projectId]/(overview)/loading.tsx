import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

export default function ProjectLoading(): JSX.Element {
  return (
    <>
      <div className="page-title-row flex-col items-stretch">
        <LoadingSkeleton label={PROJECT_COPY.loading} shapes={["heading"]} />
      </div>
      <LoadingSkeleton label={PROJECT_COPY.loading} shapes={["line"]} />
      <LoadingSkeleton label={PROJECT_COPY.loading} shapes={["line"]} />
      <section className="page-slot">
        <h2 className="section-heading">{PROGRESS_TIMELINE_COPY.heading}</h2>
        <LoadingSkeleton label={PROJECT_COPY.loading} shapes={["line"]} />
      </section>
      <section className="page-slot">
        <h2 className="section-heading">{PROJECT_COPY.chatsHeading}</h2>
        <LoadingSkeleton label={PROJECT_COPY.loading} shapes={["cards"]} />
      </section>
    </>
  );
}
