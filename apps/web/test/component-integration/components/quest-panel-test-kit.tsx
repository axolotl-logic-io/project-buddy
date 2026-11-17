import type { JSX, ReactNode } from "react";
import { ConversationPanel } from "@/components/conversation-panel.tsx";
import { QuestPanel } from "@/components/quest-panel.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";

function QuestSidebar({
  children,
  sideSections,
  initialSection,
}: {
  readonly children?: ReactNode;
  readonly sideSections?: readonly WorkspaceSection[];
  readonly initialSection?: string | undefined;
}): JSX.Element {
  return (
    <ConversationPanel
      title="Quest"
      initialSection={initialSection}
      panel={
        <QuestPanel sections={sideSections} initialSection={initialSection} />
      }
    >
      {children}
    </ConversationPanel>
  );
}

export { QuestSidebar };
