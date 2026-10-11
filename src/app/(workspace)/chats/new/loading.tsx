import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { COPY } from "@/ui/copy.ts";

export default function NewChatLoading(): JSX.Element {
  return (
    <LoadingSkeleton label={COPY.newChat.loading} shapes={["line", "cards"]} />
  );
}
