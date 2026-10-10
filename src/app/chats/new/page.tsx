import type { Metadata } from "next";
import Link from "next/link";
import { type JSX, Suspense } from "react";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { listProjects } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

// A search parameter given once; repeated or missing ones count as absent.
function singleValue(
  parameter: string | string[] | undefined,
): string | undefined {
  if (typeof parameter === "string") {
    return parameter;
  }
  return undefined;
}

async function NewChat({
  selectedProjectId,
}: {
  selectedProjectId: string | undefined;
}): Promise<JSX.Element> {
  const projects = await listProjects();
  if (projects.length === 0) {
    return (
      <p>
        {COPY.newChat.beforeProjectLink}
        <Link className="underline underline-offset-2" href="/projects">
          {COPY.newChat.projectLink}
        </Link>
        {COPY.newChat.afterProjectLink}
      </p>
    );
  }
  return (
    <NewChatForm projects={projects} selectedProjectId={selectedProjectId} />
  );
}

export const metadata: Metadata = { title: COPY.newChat.title };

export default function NewChatPage({
  searchParams,
}: PageProps<"/chats/new">): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <Link className="text-sm underline underline-offset-2" href="/projects">
        {COPY.projects.allProjectsLink}
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">
        {COPY.newChat.heading}
      </h1>
      <Suspense fallback={<p>{COPY.projects.loading}</p>}>
        {searchParams.then(
          ({ projectId }): JSX.Element => (
            <NewChat selectedProjectId={singleValue(projectId)} />
          ),
        )}
      </Suspense>
    </main>
  );
}
