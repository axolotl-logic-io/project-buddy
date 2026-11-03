import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

export default function SpellbookLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={SPELLBOOK_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
