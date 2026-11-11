import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import type { Project } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

// A quest's sections: its continuing conversation, then the quest's own
// pages.
type QuestSection =
  | "conversation"
  | "journal"
  | "plan"
  | "progress"
  | "versions";

// A quest's sections and actions share a compact header under the trail
// band. Section content follows in a panel; the conversation follows the
// header so its composer can use the page's full width and height.
// The composer saves its draft when moving between sections.
function QuestWorkspace({
  project,
  current,
  children,
  conversation,
  navigationStart,
}: {
  readonly project: Project;
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
      href: `/projects/${project.id}`,
    },
    {
      id: "journal",
      label: MEMORY_COPY.link,
      href: `/projects/${project.id}/memory`,
    },
    {
      id: "plan",
      label: PLAN_COPY.heading,
      href: `/projects/${project.id}?section=plan`,
    },
    {
      id: "progress",
      label: PROGRESS_TIMELINE_COPY.heading,
      href: `/projects/${project.id}?section=progress`,
    },
    {
      id: "versions",
      label: WORKSPACES_COPY.versions,
      href: `/projects/${project.id}/memory?section=versions`,
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
              aria-label={PROJECT_COPY.navigation}
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
          <QuestStatusControls project={project} />
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
