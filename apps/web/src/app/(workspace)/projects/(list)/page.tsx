import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ProjectInvitationFeedback } from "@/components/project-invitation-feedback.tsx";
import { ProjectInvitationList } from "@/components/project-invitation-list.tsx";
import { QuestLibrary } from "@/components/quest-library.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import { listProjectInvitations } from "@/projects/project-invitations.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { QUEST_STATUS } from "@/projects/quest-status.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export const metadata: Metadata = { title: PROJECTS_COPY.title };

// Her pending project invitations, if any, then her projects.
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
  return (
    <>
      <ProjectInvitationFeedback completed={declined === "1"} />
      <ProjectInvitationList invitations={invitations} />
      <QuestLibrary choices={choices} />
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{PROJECTS_COPY.listHeading}</h2>
        <QuestStatusTabs
          projects={projects}
          initialStatus={QUEST_STATUS.safeParse(status).data ?? "active"}
        />
      </section>
    </>
  );
}
