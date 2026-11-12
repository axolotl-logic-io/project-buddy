import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import type { Quest } from "@/quests/store.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { QUEST_COPY } from "@/ui/copy/quests.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

// A quest's sections: its continuing conversation, then the quest's own
// pages.
type QuestSection = "conversation" | "plan" | "progress";

// A quest's sections and actions share a compact header under the trail
// band. Section content follows in a panel; the conversation follows the
// header so its composer can use the page's full width and height.
// The composer saves its draft when moving between sections.
function QuestWorkspace({
  quest,
  current,
  children,
  conversation,
  navigationStart,
}: {
  readonly quest: Quest;
  readonly current: QuestSection;
  readonly children?: ReactNode;
  readonly conversation?: ReactNode;
  readonly navigationStart?: ReactNode;
}): JSX.Element {
  const links: readonly {
    readonly id: string;
    readonly label: string;
    readonly href: Route;
  }[] = [
    {
      id: "conversation",
      label: WORKSPACES_COPY.conversation,
      href: `/quests/${quest.id}`,
    },
    {
      id: "plan",
      label: PLAN_COPY.heading,
      href: `/quests/${quest.id}?section=plan`,
    },
    {
      id: "progress",
      label: PROGRESS_TIMELINE_COPY.heading,
      href: `/quests/${quest.id}?section=progress`,
    },
  ];
  let headerClass = "quest-workspace-header";
  if (conversation !== undefined) {
    headerClass += " chat-header";
  }
  return (
    <div className="quest-workspace">
      <QuestStatusFeedback>
        <header className={headerClass}>
          <div className="quest-workspace-rail">
            <nav
              aria-label={QUEST_COPY.navigation}
              className="quest-workspace-nav"
            >
              {navigationStart}
              {links.map((link) => {
                let selected: "page" | undefined;
                if (link.id === current) {
                  selected = "page";
                }
                return (
                  <Link
                    key={link.id}
                    className="quest-workspace-tab"
                    aria-current={selected}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <QuestStatusControls quest={quest} />
        </header>
        {children !== undefined && (
          <div className="workspace-content">{children}</div>
        )}
      </QuestStatusFeedback>
      {conversation !== undefined && (
        <div className="quest-conversation">{conversation}</div>
      )}
    </div>
  );
}

export { QuestWorkspace };
