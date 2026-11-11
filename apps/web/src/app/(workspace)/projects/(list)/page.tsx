import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ProjectInvitationFeedback } from "@/components/project-invitation-feedback.tsx";
import { ProjectInvitationList } from "@/components/project-invitation-list.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import { listProjectInvitations } from "@/projects/project-invitations.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { QUEST_STATUS } from "@/projects/quest-status.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export const metadata: Metadata = { title: PROJECTS_COPY.title };

// The user's pending quest invitations, if any, the four ways to start a
// quest, then their quests by status.
export default async function ProjectsPage({
  searchParams,
}: PageProps<"/projects">): Promise<JSX.Element> {
  const { declined, status } = await searchParams;
  const user = await requireUser();
  const [invitations, projects, choices] = await Promise.all([
    listProjectInvitations(user.id),
    listProjects(user.id),
    questCreationChoices(user.id),
  ]);
  const dailies = projects.find(
    (project) => project.dailies && project.role === "owner",
  );
  return (
    <>
      <div className="quests-index-invitations">
        <ProjectInvitationFeedback completed={declined === "1"} />
        <ProjectInvitationList invitations={invitations} />
      </div>
      <QuestStartChoices choices={choices} dailiesId={dailies?.id} />
      <QuestStatusTabs
        projects={projects}
        initialStatus={QUEST_STATUS.safeParse(status).data ?? "active"}
      />
    </>
  );
}
