import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export default function StandaloneChatsLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={STANDALONE_CHATS_COPY.loading} shapes={["cards"]} />
  );
}
