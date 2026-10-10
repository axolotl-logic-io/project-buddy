import Link from "next/link";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function NewChatLayout({
  children,
}: LayoutProps<"/chats/new">): JSX.Element {
  return (
    <>
      <Link className="text-sm underline underline-offset-2" href="/projects">
        {COPY.projects.allProjectsLink}
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">
        {COPY.newChat.heading}
      </h1>
      {children}
    </>
  );
}
