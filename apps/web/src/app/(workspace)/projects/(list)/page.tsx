import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { QUEST_STATUS } from "@/projects/quest-status.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export const metadata: Metadata = { title: PROJECTS_COPY.title };

// The four ways to start a quest, then the user's quests by status.
export default async function ProjectsPage({
  searchParams,
}: PageProps<"/projects">): Promise<JSX.Element> {
  const { status } = await searchParams;
  const user = await requireUser();
  const [projects, choices] = await Promise.all([
    listProjects(user.id),
    questCreationChoices(user.id),
  ]);
  const dailies = projects.find((project) => project.dailies);
  return (
    <>
      <QuestStartChoices choices={choices} dailiesId={dailies?.id} />
      <QuestStatusTabs
        projects={projects}
        initialStatus={QUEST_STATUS.safeParse(status).data ?? "active"}
      />
    </>
  );
}
