import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { NewProjectDialog } from "@/components/new-project-dialog.tsx";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The quests page's Start Quest dialog sits above the streamed list.
export default async function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): Promise<JSX.Element> {
  const user = await requireUser();
  const [userConstructs, preferred] = await Promise.all([
    ownConstructChoices(),
    interviewConstruct(user.id),
  ]);
  const choices = { userConstructs, preferredConstructId: preferred.id };
  return (
    <PageFrame>
      <div className="quests-index">
        <header className="quests-index-heading">
          <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
          <NewProjectDialog choices={choices} />
        </header>
        {children}
      </div>
    </PageFrame>
  );
}
