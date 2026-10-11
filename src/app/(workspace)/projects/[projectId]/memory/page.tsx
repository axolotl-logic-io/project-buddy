import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { Markdown } from "@/components/markdown.tsx";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
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
  const { text, version } = history[0] ?? EMPTY_MEMORY;

  return (
    <>
      <Link className="back-link" href={`/projects/${project.id}`}>
        {project.name}
      </Link>
      <h1 className="page-heading">{COPY.memory.heading}</h1>
      <section aria-label={COPY.memory.currentLabel}>
        {text.trim() === "" && (
          <p className="text-muted">{COPY.memory.empty}</p>
        )}
        {text.trim() !== "" && <Markdown running={false} text={text} />}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{COPY.memory.editHeading}</h2>
        <MemoryEditor memory={{ text, version }} projectId={project.id} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{COPY.memory.historyHeading}</h2>
        <MemoryHistory history={history} projectId={project.id} />
      </section>
    </>
  );
}
