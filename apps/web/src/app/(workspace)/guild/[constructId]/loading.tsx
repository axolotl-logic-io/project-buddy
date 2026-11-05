import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { CONSTRUCT_COPY } from "@/ui/copy/guild.ts";

export default function ConstructLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={CONSTRUCT_COPY.loading}
      shapes={["heading", "panel"]}
    />
  );
}
