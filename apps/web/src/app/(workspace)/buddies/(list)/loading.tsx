import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";

export default function BuddyListLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={BUDDIES_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
