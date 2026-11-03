import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { LISTING_COPY } from "@/ui/copy/marketplace.ts";

export default function ListingLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={LISTING_COPY.loading} shapes={["heading", "panel"]} />
  );
}
