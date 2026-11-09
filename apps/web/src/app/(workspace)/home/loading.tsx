import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { HOME_COPY } from "@/ui/copy/home.ts";

export default function HomeLoading(): JSX.Element {
  return (
    <div className="atlas">
      <div className="atlas-intro">
        <div className="atlas-title">
          <h1 className="atlas-heading">{HOME_COPY.heading}</h1>
          <p className="atlas-introduction">{HOME_COPY.introduction}</p>
        </div>
      </div>
      <div className="atlas-world">
        <LoadingSkeleton
          label={HOME_COPY.loading}
          shapes={["panel", "cards"]}
        />
      </div>
    </div>
  );
}
