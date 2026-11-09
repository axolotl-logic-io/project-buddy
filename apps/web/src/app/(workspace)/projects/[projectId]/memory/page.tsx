import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import { requireUser } from "@/auth/current-user.ts";
import { Markdown } from "@/components/markdown.tsx";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { QuestWorkspace } from "@/components/quest-workspace.tsx";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { EMPTY_MEMORY, isMemoryEmpty } from "@/memory/memory.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import { getProject } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { MemoryHistory } from "./memory-history.tsx";
import { MemoryView } from "./memory-view.tsx";

export const metadata: Metadata = { title: MEMORY_COPY.title };

export default async function MemoryPage({
  params,
}: PageProps<"/projects/[projectId]/memory">): Promise<JSX.Element> {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  const [history, activities, userConstructs] = await Promise.all([
    readMemoryHistory(user.id, project.id),
    activityChoices(user.id),
    ownConstructChoices(),
  ]);
  const memory = history[0] ?? EMPTY_MEMORY;

  return (
    <>
      <QuestWorkspace
        project={project}
        current="journal"
        newAdventure={
          <NewChatDialog
            activities={activities}
            projectId={project.id}
            selectedActivityId={DEFAULT_ACTIVITY_ID}
            userConstructs={userConstructs}
          />
        }
      />
      <div className="flex flex-col gap-2">
        <h2 className="section-heading">{MEMORY_COPY.heading}</h2>
        <p className="text-muted">{MEMORY_COPY.intro}</p>
      </div>
      <MemoryView
        viewer={user.id}
        memory={{ text: memory.text, version: memory.version }}
        projectId={project.id}
      >
        {isMemoryEmpty(memory) && (
          <p className="text-muted">{MEMORY_COPY.empty}</p>
        )}
        {!isMemoryEmpty(memory) && (
          <div className="memory-text">
            <Markdown running={false} text={memory.text} />
          </div>
        )}
      </MemoryView>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{MEMORY_COPY.historyHeading}</h2>
        <MemoryHistory history={history} projectId={project.id} />
      </section>
    </>
  );
}
