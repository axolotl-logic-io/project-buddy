import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";

export default function ConstructListLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={CONSTRUCTS_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
