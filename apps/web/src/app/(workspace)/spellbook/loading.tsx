import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

export default function Loading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={SPELLBOOK_COPY.collectionLoading}
      shapes={["panel"]}
    />
  );
}
