import type { JSX, ReactNode } from "react";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import type { Quest } from "@/quests/store.ts";

// Quest actions stay by the portrait; the conversation's sidebar holds its data.
function QuestWorkspace({
  quest,
  children,
  conversation,
  navigationStart,
}: {
  readonly quest: Quest;
  readonly current: "conversation" | "plan" | "ideas" | "progress";
  readonly children?: ReactNode;
  readonly conversation?: ReactNode;
  readonly navigationStart?: ReactNode;
}): JSX.Element {
  return (
    <div className="quest-workspace">
      <QuestStatusFeedback>
        <header className="quest-workspace-header chat-header">
          {navigationStart}
          <QuestStatusControls quest={quest} />
        </header>
        {children !== undefined && (
          <div className="workspace-content">{children}</div>
        )}
        {conversation !== undefined && (
          <div className="quest-conversation">{conversation}</div>
        )}
      </QuestStatusFeedback>
    </div>
  );
}

export { QuestWorkspace };
