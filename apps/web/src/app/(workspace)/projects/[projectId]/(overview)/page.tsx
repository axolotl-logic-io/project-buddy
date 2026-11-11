import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { QuestWorkspace } from "@/components/quest-workspace.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { listMilestones } from "@/milestones/milestone-store.ts";
import {
  changePlanAction,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { readPlanState } from "@/plan/plan-store.ts";
import { getProject } from "@/projects/store.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { ProgressTimeline } from "./progress-timeline.tsx";
import { questConversation } from "./quest-conversation.tsx";
import { QuestPlan } from "./quest-plan.tsx";

// An on-screen keyboard shrinks the page rather than covering its bottom, so
// the conversation's pinned header and composer both stay above it.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// A quest's page. Its first section is the quest's one conversation, with
// its composer; the others are its plan and progress timeline. Journal and Versions are pages of their own (memory/).
export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]">): Promise<JSX.Element> {
  const { projectId } = await params;
  const { section } = await searchParams;
  let current: "conversation" | "plan" | "progress" = "conversation";
  if (section === "plan" || section === "progress") {
    current = section;
  }
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  if (current === "conversation") {
    return (
      <QuestWorkspace
        project={project}
        current={current}
        conversation={await questConversation(project, user.id)}
      >
        {project.status !== "active" && (
          <Notice>{QUEST_STATUS_COPY.effects}</Notice>
        )}
      </QuestWorkspace>
    );
  }
  const [milestones, plan] = await Promise.all([
    listMilestones(user.id, project.id),
    readPlanState(user.id, project.id),
  ]);

  return (
    <QuestWorkspace project={project} current={current}>
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
    </QuestWorkspace>
  );
}
