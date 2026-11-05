import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";

export default function WorkshopLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={WORKSHOP_PAGE_COPY.loading}
      shapes={["heading", "cards"]}
    />
  );
}
