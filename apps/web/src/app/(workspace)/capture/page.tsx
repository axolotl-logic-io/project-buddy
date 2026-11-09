import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { Button } from "@/components/ui/button.tsx";
import { activeProjects } from "@/projects/active-projects.ts";
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
  const projects = await activeProjects(user.id);
  const chosen = projects.find(({ id }) => id === projectId) ?? projects.at(0);

  return (
    <>
      {chosen === undefined && (
        <PageWorkspace
          title={QUICK_CAPTURE_COPY.heading}
          intro={QUICK_CAPTURE_COPY.intro}
        >
          <div className="workspace-content flex flex-col items-start gap-4">
            <p>{QUICK_CAPTURE_COPY.noProjects}</p>
            <Button asChild={true} variant="secondary">
              <Link href="/projects">{QUICK_CAPTURE_COPY.noProjectsLink}</Link>
            </Button>
          </div>
        </PageWorkspace>
      )}
      {chosen !== undefined && (
        <QuickCaptureForm
          key={chosen.id}
          workspace={true}
          viewer={user.id}
          projectId={chosen.id}
          projects={projects.map(({ id, name }) => ({ id, name }))}
        />
      )}
    </>
  );
}
