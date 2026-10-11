import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { listChats } from "@/chats/store.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { getProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">): Promise<JSX.Element> {
  const { projectId } = await params;
  const [project, chats] = await Promise.all([
    getProject(projectId),
    listChats(projectId),
  ]);
  if (project === undefined) {
    notFound();
  }

  return (
    <>
      <h1 className="page-heading">{project.name}</h1>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{COPY.project.chatsHeading}</h2>
        <Link
          className="button-primary self-start"
          href={`/chats/new?projectId=${project.id}`}
        >
          {COPY.project.startChat}
        </Link>
        <ChatList chats={chats} />
      </section>
    </>
  );
}
