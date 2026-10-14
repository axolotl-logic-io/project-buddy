import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";

export default function PersonaListLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={PERSONAS_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
