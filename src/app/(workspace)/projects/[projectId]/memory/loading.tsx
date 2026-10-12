import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { COPY } from "@/ui/copy.ts";

export default function MemoryLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={COPY.memory.loading}
      shapes={["line", "heading", "panel", "cards"]}
    />
  );
}
