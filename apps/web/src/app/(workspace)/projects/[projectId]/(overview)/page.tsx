import { notFound } from "next/navigation";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import { requireUser } from "@/auth/current-user.ts";
import { listChats } from "@/chats/store.ts";
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import { readCheckInFrequency } from "@/check-ins/check-in-store.ts";
import { checkInsAreOn } from "@/check-ins/check-ins-enabled.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { CheckInSetting } from "@/components/check-in-setting.tsx";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { QuestWorkspace } from "@/components/quest-workspace.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import type { UserId } from "@/ids.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { readRecentNotes } from "@/notes/note-store.ts";
import {
  changePlanAction,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { readPlanState } from "@/plan/plan-store.ts";
import { listProjectMembers } from "@/projects/members-store.ts";
import { listSentProjectInvitations } from "@/projects/project-invitations.ts";
import { getProject, type Project } from "@/projects/store.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { ProgressTimeline } from "./progress-timeline.tsx";
import { ProjectInvite } from "./project-invite.tsx";
import { ProjectMembers } from "./project-members.tsx";
import { ProjectNotes } from "./project-notes.tsx";
import { QuestPlan } from "./quest-plan.tsx";

// The project's check-in frequency for its setting, off when unsaved, or
// null, which hides the setting, while check-ins are off for the site or
// for a member: check-ins are the owner's alone.
async function checkInSetting(
  user: UserId,
  project: Pick<Project, "id" | "role" | "status">,
): Promise<CheckInFrequency | null> {
  if (
    !checkInsAreOn() ||
    project.role !== "owner" ||
    project.status !== "active"
  ) {
    return null;
  }
  return (await readCheckInFrequency(user, project.id)) ?? null;
}

// A project's page: its name, a link to its memory, the New chat button,
// whose dialog starts chats in the project, its plan, its progress timeline, its chats, its newest notes,
// its members, and, for its owner, the invite form with its pending
// invitations and its check-in setting, once check-ins are on for the site.
export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]">): Promise<JSX.Element> {
  const { projectId } = await params;
  const { section } = await searchParams;
  let current: "adventures" | "plan" | "progress" | "notes" | "members" =
    "adventures";
  if (
    section === "plan" ||
    section === "progress" ||
    section === "notes" ||
    section === "members"
  ) {
    current = section;
  }
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  const [
    milestones,
    chats,
    activities,
    userConstructs,
    notes,
    members,
    invitations,
    frequency,
    plan,
  ] = await Promise.all([
    listMilestones(user.id, project.id),
    listChats(user.id, project.id),
    activityChoices(user.id),
    ownConstructChoices(),
    readRecentNotes(user.id, project.id),
    listProjectMembers(user.id, project.id),
    listSentProjectInvitations(user.id, project.id),
    checkInSetting(user.id, project),
    readPlanState(user.id, project.id),
  ]);

  return (
    <QuestWorkspace
      project={project}
      current={current}
      newAdventure={
        <NewChatDialog
          activities={activities}
          projectId={project.id}
          selectedActivityId={DEFAULT_ACTIVITY_ID}
          userConstructs={userConstructs}
        />
      }
    >
      {project.status !== "active" && (
        <Notice>{QUEST_STATUS_COPY.effects}</Notice>
      )}
      {current === "plan" && plan !== undefined && (
        <section className="page-slot">
          <div className="flex flex-col gap-2">
            <h2 className="section-heading">{PLAN_COPY.heading}</h2>
            <p className="text-muted">{PLAN_COPY.intro}</p>
          </div>
          <QuestPlan
            projectId={project.id}
            plan={plan}
            actions={{
              change: changePlanAction,
              undo: undoPlanChangeAction,
              command: runChatCommandAction,
            }}
          />
        </section>
      )}
      {current === "progress" && (
        <section className="page-slot">
          <h2 className="section-heading">{PROGRESS_TIMELINE_COPY.heading}</h2>
          <ProgressTimeline milestones={milestones} />
        </section>
      )}
      {current === "adventures" && (
        <section className="page-slot">
          <h2 className="section-heading">{PROJECT_COPY.chatsHeading}</h2>
          <ChatList chats={chats} />
        </section>
      )}
      {current === "notes" && (
        <ProjectNotes
          notes={notes}
          projectId={project.id}
          status={project.status}
        />
      )}
      {current === "members" && (
        <>
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
      )}
    </QuestWorkspace>
  );
}
