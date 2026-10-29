import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";

export default function ActivityListLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={ACTIVITIES_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
