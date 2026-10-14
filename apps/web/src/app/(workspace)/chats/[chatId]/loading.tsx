import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

export default function ChatLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={CHAT_COPY.loading}
      shapes={["line", "heading", "messages"]}
    />
  );
}
