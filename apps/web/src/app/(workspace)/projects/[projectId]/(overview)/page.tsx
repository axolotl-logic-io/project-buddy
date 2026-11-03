import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { newChatChoices } from "@/chats/new-chat-choices.ts";
import { listChats } from "@/chats/store.ts";
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import { readCheckInFrequency } from "@/check-ins/check-in-store.ts";
import { checkInsAreOn } from "@/check-ins/check-ins-enabled.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { CheckInSetting } from "@/components/check-in-setting.tsx";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { UserId } from "@/ids.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { readRecentNotes } from "@/notes/note-store.ts";
import { listProjectMembers } from "@/projects/members-store.ts";
import { listSentProjectInvitations } from "@/projects/project-invitations.ts";
import { getProject, type Project } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { ProgressTimeline } from "./progress-timeline.tsx";
import { ProjectInvite } from "./project-invite.tsx";
import { ProjectMembers } from "./project-members.tsx";
import { ProjectNotes } from "./project-notes.tsx";

// The project's check-in frequency for its setting, off when unsaved, or
// null, which hides the setting, while check-ins are off for the site or
// for a member: check-ins are the owner's alone.
async function checkInSetting(
  user: UserId,
  project: Pick<Project, "id" | "role">,
): Promise<CheckInFrequency | null> {
  if (!checkInsAreOn() || project.role !== "owner") {
    return null;
  }
  return (await readCheckInFrequency(user, project.id)) ?? null;
}

// A project's page: its name, a link to its memory, the new-chat form with
// the project chosen, its progress timeline, its chats, its newest notes,
// its members, and, for its owner, the invite form with its pending
// invitations and its check-in setting, once check-ins are on for the site.
export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">): Promise<JSX.Element> {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  const [milestones, chats, choices, notes, members, invitations, frequency] =
    await Promise.all([
      listMilestones(user.id, project.id),
      listChats(user.id, project.id),
      newChatChoices(user.id),
      readRecentNotes(user.id, project.id),
      listProjectMembers(user.id, project.id),
      listSentProjectInvitations(user.id, project.id),
      checkInSetting(user.id, project),
    ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-heading">{project.name}</h1>
        <Button asChild={true} variant="secondary">
          <Link href={`/projects/${project.id}/memory`}>
            {MEMORY_COPY.link}
          </Link>
        </Button>
      </div>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{PROJECT_COPY.newChatHeading}</h2>
        <NewChatForm
          {...choices}
          selectedActivityId={DEFAULT_ACTIVITY_ID}
          selectedProjectId={project.id}
        />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{PROGRESS_TIMELINE_COPY.heading}</h2>
        <ProgressTimeline milestones={milestones} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{PROJECT_COPY.chatsHeading}</h2>
        <ChatList chats={chats} />
      </section>
      <ProjectNotes notes={notes} projectId={project.id} />
      <ProjectMembers
        members={members}
        projectId={project.id}
        viewer={user.id}
      />
      {invitations !== undefined && (
        <ProjectInvite invitations={invitations} projectId={project.id} />
      )}
      {frequency !== null && (
        <CheckInSetting frequency={frequency} projectId={project.id} />
      )}
    </>
  );
}
