import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { CurrentQuestCard } from "@/components/current-quest.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import { readCurrentQuest } from "@/projects/current-quest-store.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { QUEST_STATUS } from "@/projects/quest-status.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export const metadata: Metadata = { title: PROJECTS_COPY.title };

// The quest to continue, the four ways to start a quest, then the user's
// quests by status.
export default async function ProjectsPage({
  searchParams,
}: PageProps<"/projects">): Promise<JSX.Element> {
  const { status } = await searchParams;
  const user = await requireUser();
  const [projects, choices, current] = await Promise.all([
    listProjects(user.id),
    questCreationChoices(user.id),
    readCurrentQuest(user.id),
  ]);
  const dailies = projects.find((project) => project.dailies);
  return (
    <>
      <CurrentQuestCard quest={current} />
      <QuestStartChoices choices={choices} dailiesId={dailies?.id} />
      <QuestStatusTabs
        projects={projects}
        initialStatus={QUEST_STATUS.safeParse(status).data ?? "active"}
      />
    </>
  );
}
