import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NewProjectForm } from "@/components/new-project-form";
import { ProjectList } from "@/components/project-list";
import { listProjects } from "@/projects/store";

export const metadata: Metadata = { title: "Projects · Project Buddy" };

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Link className="text-sm underline underline-offset-2" href="/">
        Home
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">Projects</h1>
      <NewProjectForm />
      <Suspense fallback={<p>Loading projects…</p>}>
        <Projects />
      </Suspense>
    </main>
  );
}

async function Projects() {
  await connection();
  return <ProjectList projects={await listProjects()} />;
}
