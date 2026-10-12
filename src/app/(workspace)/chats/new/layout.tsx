import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { COPY } from "@/ui/copy.ts";

export default function NewChatLayout({
  children,
}: LayoutProps<"/chats/new">): JSX.Element {
  return (
    <>
      <BackLink href="/projects">{COPY.projects.allProjectsLink}</BackLink>
      <h1 className="page-heading">{COPY.newChat.heading}</h1>
      <div className="panel">{children}</div>
    </>
  );
}
