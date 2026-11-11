import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { QuestJournal } from "@/components/journal/quest-journal.tsx";
import { Markdown } from "@/components/markdown.tsx";
import { QuestWorkspace } from "@/components/quest-workspace.tsx";
import { EMPTY_MEMORY, isMemoryEmpty } from "@/memory/memory.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import { EMPTY_PLAN } from "@/plan/plan.ts";
import { readPlan } from "@/plan/plan-store.ts";
import { getProject } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { MemoryHistory } from "./memory-history.tsx";
import { MemoryView } from "./memory-view.tsx";
import { PlanInJournal } from "./plan-in-journal.tsx";

export const metadata: Metadata = { title: MEMORY_COPY.title };

export default async function MemoryPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]/memory">): Promise<JSX.Element> {
  const { projectId } = await params;
  const { section } = await searchParams;
  let current: "journal" | "versions" = "journal";
  if (section === "versions") {
    current = "versions";
  }
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  const journal = await QuestJournal({ owner: user.id, projectId: project.id });
  const [history, plan] = await Promise.all([
    readMemoryHistory(user.id, project.id),
    readPlan(user.id, project.id),
  ]);
  const memory = history[0] ?? EMPTY_MEMORY;

  return (
    <QuestWorkspace project={project} current={current}>
      {current === "journal" && (
        <>
          {journal}
          <p className="text-muted">{MEMORY_COPY.intro}</p>
          <PlanInJournal projectId={project.id} plan={plan ?? EMPTY_PLAN} />
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
        </>
      )}
      {current === "versions" && (
        <section className="flex flex-col gap-4">
          <h2 className="section-heading">{MEMORY_COPY.historyHeading}</h2>
          <MemoryHistory history={history} projectId={project.id} />
        </section>
      )}
    </QuestWorkspace>
  );
}
