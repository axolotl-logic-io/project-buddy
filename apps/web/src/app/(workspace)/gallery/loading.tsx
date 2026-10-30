import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

export default function GalleryLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={GENERATION_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
