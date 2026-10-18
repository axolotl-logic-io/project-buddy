import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { singleValue } from "@/app/search-param.ts";
import { requireUser } from "@/auth/current-user.ts";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { parseProjectId } from "@/ids.ts";
import { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

export const metadata: Metadata = { title: NEW_CHAT_COPY.title };

export default async function NewChatPage({
  searchParams,
}: PageProps<"/chats/new">): Promise<JSX.Element> {
  const { projectId } = await searchParams;
  const user = await requireUser();
  const projects = await listProjects(user.id);
  if (projects.length === 0) {
    return (
      <p>
        {NEW_CHAT_COPY.needsProject(
          <Link className="text-link" href="/projects" key="project">
            {NEW_CHAT_COPY.projectLink}
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
