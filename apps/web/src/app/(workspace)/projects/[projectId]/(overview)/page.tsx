import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { interviewChatOf } from "@/activities/activity-sessions.ts";
import { requireUser } from "@/auth/current-user.ts";
import { listChats } from "@/chats/store.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getProject } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">): Promise<JSX.Element> {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProject(user.id, projectId);
  if (project === undefined) {
    notFound();
  }
  const [chats, interviewChatId] = await Promise.all([
    listChats(user.id, project.id),
    interviewChatOf(user.id, project.id),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-heading">{project.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {interviewChatId !== undefined && (
            <Button asChild={true} variant="secondary">
              <Link href={`/chats/${interviewChatId}`}>
                {PROJECT_COPY.interviewLink}
              </Link>
            </Button>
          )}
          <Button asChild={true} variant="secondary">
            <Link href={`/projects/${project.id}/memory`}>
              {MEMORY_COPY.link}
            </Link>
          </Button>
        </div>
      </div>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-heading">{PROJECT_COPY.chatsHeading}</h2>
          <Button asChild={true}>
            <Link href={`/chats/new?projectId=${project.id}`}>
              {PROJECT_COPY.startChat}
            </Link>
          </Button>
        </div>
        <ChatList chats={chats} />
      </section>
    </>
  );
}
