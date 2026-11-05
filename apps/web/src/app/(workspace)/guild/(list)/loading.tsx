import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { GUILD_COPY } from "@/ui/copy/guild.ts";

export default function ConstructListLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={GUILD_COPY.loading} shapes={["heading", "cards"]} />
  );
}
