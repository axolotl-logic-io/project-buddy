import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { listProjects } from "@/projects/store.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import { QuickCaptureForm } from "./quick-capture-form.tsx";

export const metadata: Metadata = { title: QUICK_CAPTURE_COPY.title };

// Quick capture, at /capture, which the header links to from every
// signed-in page: a note saved to the memory of one of the user's projects.
// The project is chosen with projectId=PROJECT_ID, or else is their newest
// one. With no projects, the page sends them to start one.
export default async function QuickCapturePage({
  searchParams,
}: PageProps<"/capture">): Promise<JSX.Element> {
  const { projectId } = await searchParams;
  const user = await requireUser();
  const projects = await listProjects(user.id);
  const chosen = projects.find(({ id }) => id === projectId) ?? projects.at(0);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{QUICK_CAPTURE_COPY.heading}</h1>
        <p className="text-muted">{QUICK_CAPTURE_COPY.intro}</p>
      </div>
      {chosen === undefined && (
        <div className="panel flex flex-col items-start gap-4">
          <p>{QUICK_CAPTURE_COPY.noProjects}</p>
          <Button asChild={true} variant="secondary">
            <Link href="/projects">{QUICK_CAPTURE_COPY.noProjectsLink}</Link>
          </Button>
        </div>
      )}
      {chosen !== undefined && (
        <QuickCaptureForm
          projectId={chosen.id}
          projects={projects.map(({ id, name }) => ({ id, name }))}
          viewer={user.id}
        />
      )}
    </>
  );
}
