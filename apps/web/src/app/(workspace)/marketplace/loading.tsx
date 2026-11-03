import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";

export default function MarketplaceLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={MARKETPLACE_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
