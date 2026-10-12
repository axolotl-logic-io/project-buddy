import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";

export default function MemoryLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={MEMORY_COPY.loading}
      shapes={["line", "heading", "panel", "cards"]}
    />
  );
}
