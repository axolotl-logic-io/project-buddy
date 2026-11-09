import type { JSX } from "react";
import { LoadingShapes } from "@/components/ui/loading-skeleton.tsx";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

export default function ProjectLoading(): JSX.Element {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-8"
      role="status"
      aria-label={PROJECT_COPY.loading}
    >
      <div className="quest-workspace">
        <div className="quest-workspace-heading">
          <LoadingShapes shapes={["heading", "line"]} />
        </div>
        <div className="workspace-rail">
          <LoadingShapes shapes={["line"]} />
        </div>
        <div className="workspace-content">
          <section className="page-slot">
            <h2 className="section-heading">{PROJECT_COPY.chatsHeading}</h2>
            <LoadingShapes shapes={["cards"]} />
          </section>
        </div>
      </div>
    </div>
  );
}
