import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewChatForm } from "@/components/new-chat-form";
import { listProjects } from "@/projects/store";

export const metadata: Metadata = { title: "New chat · Project Buddy" };

export default function NewChatPage({ searchParams }: PageProps<"/chats/new">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Link className="text-sm underline underline-offset-2" href="/projects">
        All projects
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">Start a chat</h1>
      <Suspense fallback={<p>Loading projects…</p>}>
        {searchParams.then(({ projectId }) => (
          <NewChat
            selectedProjectId={
              typeof projectId === "string" ? projectId : undefined
            }
          />
        ))}
      </Suspense>
    </main>
  );
}

async function NewChat({
  selectedProjectId,
}: {
  selectedProjectId?: string | undefined;
}) {
  const projects = await listProjects();
  if (projects.length === 0) {
    return (
      <p>
        Create a{" "}
        <Link className="underline underline-offset-2" href="/projects">
          project
        </Link>{" "}
        first.
      </p>
    );
  }
  return (
    <NewChatForm projects={projects} selectedProjectId={selectedProjectId} />
  );
}
