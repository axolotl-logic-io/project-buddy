import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";

export default function RetirementLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={RETIREMENT_COPY.loading}
      shapes={["line", "cards"]}
    />
  );
}
