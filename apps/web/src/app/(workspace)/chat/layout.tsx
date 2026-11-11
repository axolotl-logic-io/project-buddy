import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";

export default function StandaloneChatLayout({
  children,
}: LayoutProps<"/chat">): JSX.Element {
  return <PageFrame>{children}</PageFrame>;
}
