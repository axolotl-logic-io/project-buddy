import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";

export default function StandaloneChatsLayout({
  children,
}: LayoutProps<"/chat">): JSX.Element {
  return <PageFrame>{children}</PageFrame>;
}
