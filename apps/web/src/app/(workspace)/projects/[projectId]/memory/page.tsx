import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { Markdown } from "@/components/markdown.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { EMPTY_MEMORY, isMemoryEmpty } from "@/memory/memory.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import { getProject } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { MemoryHistory } from "./memory-history.tsx";
import { MemoryView } from "./memory-view.tsx";

export const metadata: Metadata = { title: MEMORY_COPY.title };

export default async function MemoryPage({
  params,
}: PageProps<"/projects/[projectId]/memory">): Promise<JSX.Element> {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  const history = await readMemoryHistory(user.id, project.id);
  const memory = history[0] ?? EMPTY_MEMORY;

  return (
    <>
      <BackLink href={`/projects/${project.id}`}>{project.name}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{MEMORY_COPY.heading}</h1>
        <p className="text-muted">{MEMORY_COPY.intro}</p>
      </div>
      <MemoryView
        memory={{ text: memory.text, version: memory.version }}
        projectId={project.id}
        viewer={user.id}
      >
        {isMemoryEmpty(memory) && (
          <p className="text-muted">{MEMORY_COPY.empty}</p>
        )}
        {!isMemoryEmpty(memory) && (
          <Markdown running={false} text={memory.text} />
        )}
      </MemoryView>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{MEMORY_COPY.historyHeading}</h2>
        <MemoryHistory
          history={history}
          projectId={project.id}
          viewer={user.id}
        />
      </section>
    </>
  );
}
