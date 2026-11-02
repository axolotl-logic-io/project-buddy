import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The new chat page's frame. The page gives its own heading, which is Today
// when the Today section shows.
export default function NewChatLayout({
  children,
}: LayoutProps<"/chats/new">): JSX.Element {
  return (
    <>
      <BackLink href="/projects">{PROJECTS_COPY.allProjectsLink}</BackLink>
      {children}
    </>
  );
}
