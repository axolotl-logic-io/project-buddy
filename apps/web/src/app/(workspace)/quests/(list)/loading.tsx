import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";

export default function QuestListLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={QUESTS_COPY.loading} shapes={["panel", "cards"]} />
  );
}
