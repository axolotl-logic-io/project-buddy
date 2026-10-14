import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

export default function ProjectLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={PROJECT_COPY.loading}
      shapes={["heading", "line", "cards"]}
    />
  );
}
