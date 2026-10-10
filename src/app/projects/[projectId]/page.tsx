import Link from "next/link";
import { notFound } from "next/navigation";
import React, { type JSX } from "react";
import { listChats } from "@/chats/store.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { getProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

async function Project({
  projectId,
}: {
  projectId: string;
}): Promise<JSX.Element> {
  const [project, chats] = await Promise.all([
    getProject(projectId),
    listChats(projectId),
  ]);
  if (project === undefined) {
    notFound();
  }

  return (
    <>
      <h1 className="font-semibold text-3xl tracking-tight">{project.name}</h1>
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-xl">{COPY.project.chatsHeading}</h2>
        <Link
          className="self-start rounded bg-primary px-4 py-2 text-on-primary"
          href={`/chats/new?projectId=${project.id}`}
        >
          {COPY.project.startChat}
        </Link>
        <ChatList chats={chats} />
      </section>
    </>
  );
}

export default function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Link className="text-sm underline underline-offset-2" href="/projects">
        {COPY.projects.allProjectsLink}
      </Link>
      <React.Suspense fallback={<p>{COPY.project.loading}</p>}>
        {params.then(
          ({ projectId }): JSX.Element => (
            <Project projectId={projectId} />
          ),
        )}
      </React.Suspense>
    </main>
  );
}
