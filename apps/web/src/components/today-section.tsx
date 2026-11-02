import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { ChatList } from "@/components/chat-list.tsx";
import type { Today, TodayProject } from "@/today/today.ts";
import { TODAY_COPY } from "@/ui/copy/chat.ts";

const PROJECTS_HEADING_ID = "today-projects-heading";
const CHATS_HEADING_ID = "today-chats-heading";

// A project's next step, or nothing if its memory records none.
function NextStep({
  nextStep,
}: {
  readonly nextStep: string | undefined;
}): ReactNode {
  if (nextStep === undefined) {
    return null;
  }
  return (
    <p className="min-w-0 break-words">
      <span className="text-muted">{TODAY_COPY.nextStepLabel}</span> {nextStep}
    </p>
  );
}

// A project as a card: its name, linking to the project, its next step, and
// a Continue link to its latest chat, named for the project so each
// Continue link is told apart.
function ProjectCard({
  entry: { project, nextStep, latestChat },
}: {
  readonly entry: TodayProject;
}): JSX.Element {
  return (
    <li className="card flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          className="card-title max-w-full self-start truncate text-link"
          href={`/projects/${project.id}`}
        >
          {project.name}
        </Link>
        <NextStep nextStep={nextStep} />
      </div>
      <Link
        aria-label={TODAY_COPY.continueLabel(project.name)}
        className="button-secondary self-start sm:self-center"
        href={`/chats/${latestChat}`}
      >
        {TODAY_COPY.continue}
      </Link>
    </li>
  );
}

function ProjectsPart({
  projects,
}: {
  readonly projects: Today["projects"];
}): ReactNode {
  if (projects.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby={PROJECTS_HEADING_ID}
      className="flex flex-col gap-3"
    >
      <h2 className="section-heading" id={PROJECTS_HEADING_ID}>
        {TODAY_COPY.projectsHeading}
      </h2>
      <ul className="flex flex-col gap-3">
        {projects.map((entry) => (
          <ProjectCard entry={entry} key={entry.project.id} />
        ))}
      </ul>
    </section>
  );
}

function ChatsPart({ chats }: { readonly chats: Today["chats"] }): ReactNode {
  if (chats.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={CHATS_HEADING_ID} className="flex flex-col gap-3">
      <h2 className="section-heading" id={CHATS_HEADING_ID}>
        {TODAY_COPY.chatsHeading}
      </h2>
      <ChatList chats={chats} showProjectNames={true} />
    </section>
  );
}

// The landing page's Today section: what is waiting for the user, under the
// page's heading, Today. Unread check-ins (#609) can join as a part above
// the projects.
function TodaySection({ today }: { readonly today: Today }): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-heading">{TODAY_COPY.heading}</h1>
      <ProjectsPart projects={today.projects} />
      <ChatsPart chats={today.chats} />
    </div>
  );
}

export { TodaySection };
