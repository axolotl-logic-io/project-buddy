import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export default function StandaloneChatsLayout({
  children,
}: LayoutProps<"/chat">): JSX.Element {
  return (
    <PageFrame>
      <h1 className="page-heading">{STANDALONE_CHATS_COPY.heading}</h1>
      {children}
    </PageFrame>
  );
}
