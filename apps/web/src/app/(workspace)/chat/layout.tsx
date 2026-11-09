import type { JSX } from "react";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export default function StandaloneChatsLayout({
  children,
}: LayoutProps<"/chat">): JSX.Element {
  return (
    <>
      <h1 className="page-heading">{STANDALONE_CHATS_COPY.heading}</h1>
      {children}
    </>
  );
}
