import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { ACTIVITY_COPY } from "@/ui/copy/activities.ts";

export default function ActivityLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={ACTIVITY_COPY.loading}
      shapes={["heading", "panel"]}
    />
  );
}
