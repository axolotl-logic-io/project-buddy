import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { SPELL_COPY } from "@/ui/copy/spells.ts";

export default function SpellLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={SPELL_COPY.loading} shapes={["heading", "panel"]} />
  );
}
