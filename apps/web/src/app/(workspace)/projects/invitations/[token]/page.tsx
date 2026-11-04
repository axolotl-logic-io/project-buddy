import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ProjectInvitationAnswer } from "@/components/project-invitation-answer.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { readProjectInvitation } from "@/projects/project-invitations.ts";
import { PROJECT_INVITATION_COPY } from "@/ui/copy/project-invitations.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export const metadata: Metadata = { title: PROJECT_INVITATION_COPY.title };

// The page a project invitation's email opens, once its sign-in link has
// signed her in: who invited her to which project, with Join and Decline.
// Opening it answers nothing. An invitation that is answered, revoked,
// unknown or someone else's is not found.
export default async function ProjectInvitationPage({
  params,
}: PageProps<"/projects/invitations/[token]">): Promise<JSX.Element> {
  const { token } = await params;
  const user = await requireUser();
  const invitation = await readProjectInvitation(user.id, token);
  if (invitation === undefined) {
    notFound();
  }
  const { question, from, shared } = PROJECT_INVITATION_COPY;
  return (
    <>
      <BackLink href="/projects">{PROJECTS_COPY.allProjectsLink}</BackLink>
      <section className="panel flex flex-col gap-4">
        <h1 className="page-heading">{question(invitation.project.name)}</h1>
        <p className="wrap-anywhere">{from(invitation.inviter)}</p>
        <p className="text-muted">{shared}</p>
        <ProjectInvitationAnswer invitation={invitation} />
      </section>
    </>
  );
}
