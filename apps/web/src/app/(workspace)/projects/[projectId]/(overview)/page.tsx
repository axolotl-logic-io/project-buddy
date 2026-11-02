import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { newChatChoices } from "@/chats/new-chat-choices.ts";
import { listChats } from "@/chats/store.ts";
import { readCheckInFrequency } from "@/check-ins/check-in-store.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { CheckInSetting } from "@/components/check-in-setting.tsx";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getProject } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

// A project's page: its name, a link to its memory, the new-chat form with
// the project chosen, the project's chats, and its check-in setting.
export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">): Promise<JSX.Element> {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  const [chats, choices, frequency] = await Promise.all([
    listChats(user.id, project.id),
    newChatChoices(user.id),
    readCheckInFrequency(user.id, project.id),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-heading">{project.name}</h1>
        <Button asChild={true} variant="secondary">
          <Link href={`/projects/${project.id}/memory`}>
            {MEMORY_COPY.link}
          </Link>
        </Button>
      </div>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{PROJECT_COPY.newChatHeading}</h2>
        <NewChatForm
          {...choices}
          selectedActivityId={DEFAULT_ACTIVITY_ID}
          selectedProjectId={project.id}
        />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{PROJECT_COPY.chatsHeading}</h2>
        <ChatList chats={chats} />
      </section>
      <CheckInSetting frequency={frequency ?? "off"} projectId={project.id} />
    </>
  );
}
