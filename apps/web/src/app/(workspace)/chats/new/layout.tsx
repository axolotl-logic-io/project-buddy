import type { JSX } from "react";

// The new chat page's frame. The page gives its own heading, which is Today
// when the Today section shows.
export default function NewChatLayout({
  children,
}: LayoutProps<"/chats/new">): JSX.Element {
  return <>{children}</>;
}
