import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { PERSONA_COPY } from "@/ui/copy/personas.ts";

export default function PersonaLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={PERSONA_COPY.loading}
      shapes={["heading", "panel"]}
    />
  );
}
