import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export default function NewChatLayout({
  children,
}: LayoutProps<"/chats/new">): JSX.Element {
  return (
    <>
      <BackLink href="/projects">{PROJECTS_COPY.allProjectsLink}</BackLink>
      <h1 className="page-heading">{NEW_CHAT_COPY.heading}</h1>
      <div className="panel">{children}</div>
    </>
  );
}
