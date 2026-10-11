import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { COPY } from "@/ui/copy.ts";

export default function ChatLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={COPY.chat.loading}
      shapes={["line", "heading", "messages"]}
    />
  );
}
