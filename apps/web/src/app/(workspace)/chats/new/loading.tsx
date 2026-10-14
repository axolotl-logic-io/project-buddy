import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

export default function NewChatLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={NEW_CHAT_COPY.loading} shapes={["line", "cards"]} />
  );
}
