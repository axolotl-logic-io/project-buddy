import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { parseProjectId } from "@/ids.ts";
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

export const metadata: Metadata = { title: COPY.newChat.title };

export default async function NewChatPage({
  searchParams,
}: PageProps<"/chats/new">): Promise<JSX.Element> {
  const { projectId } = await searchParams;
  const projects = await listProjects();
  if (projects.length === 0) {
    return (
      <p>
        {COPY.newChat.needsProject(
          <Link className="text-link" href="/projects" key="project">
            {COPY.newChat.projectLink}
          </Link>,
        )}
      </p>
    );
  }
  return (
    <NewChatForm
      projects={projects}
      selectedProjectId={parseProjectId(singleValue(projectId) ?? "")}
    />
  );
}
