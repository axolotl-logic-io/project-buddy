import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatList } from "@/components/chat-list";
import { listChats } from "@/chats/store";
import { getProject } from "@/projects/store";

export default function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Link className="text-sm underline underline-offset-2" href="/projects">
        All projects
      </Link>
      <Suspense fallback={<p>Loading project…</p>}>
        {params.then(({ projectId }) => (
          <Project projectId={projectId} />
        ))}
      </Suspense>
    </main>
  );
}

async function Project({ projectId }: { projectId: string }) {
  const [project, chats] = await Promise.all([
    getProject(projectId),
    listChats(projectId),
  ]);
  if (!project) notFound();

  return (
    <>
      <h1 className="font-semibold text-3xl tracking-tight">{project.name}</h1>
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-xl">Chats</h2>
        <Link
          className="self-start rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          href={`/chats/new?projectId=${project.id}`}
        >
          Start a chat
        </Link>
        <ChatList chats={chats} />
      </section>
    </>
  );
}
