import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { COPY } from "@/ui/copy.ts";

export default function ProjectLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={COPY.project.loading}
      shapes={["heading", "line", "cards"]}
    />
  );
}
