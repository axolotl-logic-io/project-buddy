import Link from "next/link";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function NewChatLayout({
  children,
}: LayoutProps<"/chats/new">): JSX.Element {
  return (
    <>
      <Link className="back-link" href="/projects">
        {COPY.projects.allProjectsLink}
      </Link>
      <h1 className="page-heading">{COPY.newChat.heading}</h1>
      {children}
    </>
  );
}
