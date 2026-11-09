import type { JSX } from "react";
import { LoadingShapes } from "@/components/ui/loading-skeleton.tsx";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

export default function ProjectLoading(): JSX.Element {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-8"
      role="status"
      aria-label={PROJECT_COPY.loading}
    >
      <div className="page-title-row flex-col items-stretch">
        <LoadingShapes shapes={["heading"]} />
      </div>
      <LoadingShapes shapes={["line"]} />
      <LoadingShapes shapes={["line"]} />
      <section className="page-slot">
        <h2 className="section-heading">{PROGRESS_TIMELINE_COPY.heading}</h2>
        <LoadingShapes shapes={["line"]} />
      </section>
      <section className="page-slot">
        <h2 className="section-heading">{PROJECT_COPY.chatsHeading}</h2>
        <LoadingShapes shapes={["cards"]} />
      </section>
    </div>
  );
}
