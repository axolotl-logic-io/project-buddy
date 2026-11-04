import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ProjectInvitationFeedback } from "@/components/project-invitation-feedback.tsx";
import { ProjectInvitationList } from "@/components/project-invitation-list.tsx";
import { ProjectList } from "@/components/project-list.tsx";
import { listProjectInvitations } from "@/projects/project-invitations.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export const metadata: Metadata = { title: PROJECTS_COPY.title };

// Her pending project invitations, if any, then her projects.
export default async function ProjectsPage({
  searchParams,
}: PageProps<"/projects">): Promise<JSX.Element> {
  const { declined } = await searchParams;
  const user = await requireUser();
  const [invitations, projects] = await Promise.all([
    listProjectInvitations(user.id),
    listProjects(user.id),
  ]);
  return (
    <>
      <ProjectInvitationFeedback completed={declined === "1"} />
      <ProjectInvitationList invitations={invitations} />
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{PROJECTS_COPY.listHeading}</h2>
        <ProjectList projects={projects} />
      </section>
    </>
  );
}
