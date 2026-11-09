import Link from "next/link";
import type { JSX, ReactNode } from "react";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import { QuestTitle } from "@/components/quest-title.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { Project } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

function QuestWorkspace({
  project,
  current,
  newAdventure,
}: {
  readonly project: Project;
  readonly current: "adventures" | "journal";
  readonly newAdventure: ReactNode;
}): JSX.Element {
  let adventuresCurrent: "page" | undefined;
  let journalCurrent: "page" | undefined;
  if (current === "adventures") {
    adventuresCurrent = "page";
  } else {
    journalCurrent = "page";
  }
  return (
    <QuestStatusFeedback>
      <header className="quest-workspace">
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
            <Link
              className="quest-workspace-tab"
              aria-current={adventuresCurrent}
              href={`/projects/${project.id}`}
            >
              {PROJECT_COPY.chatsHeading}
            </Link>
            <Link
              className="quest-workspace-tab"
              aria-current={journalCurrent}
              href={`/projects/${project.id}/memory`}
            >
              <Icon name="book" />
              {MEMORY_COPY.link}
            </Link>
          </nav>
          <QuestStatusControls project={project} />
        </div>
      </header>
    </QuestStatusFeedback>
  );
}

export { QuestWorkspace };
