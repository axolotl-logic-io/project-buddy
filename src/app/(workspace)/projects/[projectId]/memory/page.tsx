import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { Markdown } from "@/components/markdown.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { EMPTY_MEMORY, isMemoryEmpty } from "@/memory/memory.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import { getProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";
import { MemoryEditor } from "./memory-editor.tsx";
import { MemoryHistory } from "./memory-history.tsx";

export const metadata: Metadata = { title: COPY.memory.title };

export default async function MemoryPage({
  params,
}: PageProps<"/projects/[projectId]/memory">): Promise<JSX.Element> {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (project === undefined) {
    notFound();
  }
  const history = await readMemoryHistory(project.id);
  const memory = history[0] ?? EMPTY_MEMORY;

  return (
    <>
      <BackLink href={`/projects/${project.id}`}>{project.name}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{COPY.memory.heading}</h1>
        <p className="text-muted">{COPY.memory.intro}</p>
      </div>
      <section aria-label={COPY.memory.currentLabel} className="panel">
        {isMemoryEmpty(memory) && (
          <p className="text-muted">{COPY.memory.empty}</p>
        )}
        {!isMemoryEmpty(memory) && (
          <Markdown running={false} text={memory.text} />
        )}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{COPY.memory.editHeading}</h2>
        <MemoryEditor
          memory={{ text: memory.text, version: memory.version }}
          projectId={project.id}
        />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{COPY.memory.historyHeading}</h2>
        <MemoryHistory history={history} projectId={project.id} />
      </section>
    </>
  );
}
