import type { JSX } from "react";
import { LoadingShapes } from "@/components/ui/loading-skeleton.tsx";
import { QUEST_COPY } from "@/ui/copy/quests.ts";

export default function QuestLoading(): JSX.Element {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-8"
      role="status"
      aria-label={QUEST_COPY.loading}
    >
      <div className="quest-workspace">
        <div className="quest-workspace-heading">
          <LoadingShapes shapes={["line"]} />
        </div>
        <div className="workspace-rail">
          <LoadingShapes shapes={["line"]} />
        </div>
      </div>
      <div className="quest-conversation">
        <LoadingShapes shapes={["messages"]} />
      </div>
    </div>
  );
}
