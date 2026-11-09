import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";

// The new chat page's frame. The page gives its own heading, which is Today
// when the Today section shows.
export default function NewChatLayout({
  children,
}: LayoutProps<"/chats/new">): JSX.Element {
  return <PageFrame>{children}</PageFrame>;
}
