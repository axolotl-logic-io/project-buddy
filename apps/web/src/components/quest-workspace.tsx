import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import { QuestTitle } from "@/components/quest-title.tsx";
import type { Project } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PROJECT_NOTES_COPY } from "@/ui/copy/notes.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

function QuestWorkspace({
  project,
  current,
  newAdventure,
  children,
}: {
  readonly project: Project;
  readonly current:
    | "adventures"
    | "journal"
    | "progress"
    | "notes"
    | "versions"
    | "members";
  readonly newAdventure: ReactNode;
  readonly children?: ReactNode;
}): JSX.Element {
  const links: readonly {
    readonly id: string;
    readonly label: string;
    readonly href: Route;
  }[] = [
    {
      id: "adventures",
      label: PROJECT_COPY.chatsHeading,
      href: `/projects/${project.id}`,
    },
    {
      id: "journal",
      label: MEMORY_COPY.link,
      href: `/projects/${project.id}/memory`,
    },
    {
      id: "progress",
      label: PROGRESS_TIMELINE_COPY.heading,
      href: `/projects/${project.id}?section=progress`,
    },
    {
      id: "notes",
      label: PROJECT_NOTES_COPY.heading,
      href: `/projects/${project.id}?section=notes`,
    },
    {
      id: "versions",
      label: WORKSPACES_COPY.versions,
      href: `/projects/${project.id}/memory?section=versions`,
    },
    {
      id: "members",
      label: WORKSPACES_COPY.members,
      href: `/projects/${project.id}?section=members`,
    },
  ];
  return (
    <QuestStatusFeedback>
      <div className="quest-workspace">
        <header>
          <div className="quest-workspace-heading">
            <div className="min-w-0">
              <QuestTitle project={project} />
              <p className="quest-workspace-status">
                {QUEST_STATUS_COPY.labels[project.status]}
              </p>
            </div>
            {newAdventure}
          </div>
          <div className="quest-workspace-rail">
            <nav
              aria-label={PROJECT_COPY.navigation}
              className="quest-workspace-nav"
            >
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
            <QuestStatusControls project={project} />
          </div>
        </header>
        {children !== undefined && (
          <div className="workspace-content">{children}</div>
        )}
      </div>
    </QuestStatusFeedback>
  );
}

export { QuestWorkspace };
