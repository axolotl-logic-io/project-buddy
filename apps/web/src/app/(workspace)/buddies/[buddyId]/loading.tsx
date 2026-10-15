import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { BUDDY_COPY } from "@/ui/copy/buddies.ts";

export default function BuddyLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={BUDDY_COPY.loading} shapes={["heading", "panel"]} />
  );
}
