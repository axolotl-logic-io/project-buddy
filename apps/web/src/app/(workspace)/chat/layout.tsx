import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export default function StandaloneChatsLayout({
  children,
}: LayoutProps<"/chat">): JSX.Element {
  return (
    <>
      <BackLink href={HOME_PATH}>{STANDALONE_CHATS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{STANDALONE_CHATS_COPY.heading}</h1>
      {children}
    </>
  );
}
