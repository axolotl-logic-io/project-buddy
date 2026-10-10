import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import React, { type JSX } from "react";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { ProjectList } from "@/components/project-list.tsx";
import { listProjects } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

async function Projects(): Promise<JSX.Element> {
  await connection();
  return <ProjectList projects={await listProjects()} />;
}

export const metadata: Metadata = { title: COPY.projects.title };

export default function ProjectsPage(): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Link className="text-sm underline underline-offset-2" href="/">
        {COPY.projects.homeLink}
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">
        {COPY.projects.heading}
      </h1>
      <NewProjectForm />
      <React.Suspense fallback={<p>{COPY.projects.loading}</p>}>
        <Projects />
      </React.Suspense>
    </main>
  );
}
