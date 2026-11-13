import type { JSX, ReactNode } from "react";
import { QuestStatusFeedback } from "@/components/quest-status-controls.tsx";

// The conversation and its sidebar share quest status feedback.
function QuestWorkspace({
  children,
  conversation,
}: {
  readonly children?: ReactNode;
  readonly conversation?: ReactNode;
}): JSX.Element {
  return (
    <div className="quest-workspace">
      <QuestStatusFeedback>
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
