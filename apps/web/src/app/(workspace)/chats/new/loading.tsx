import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// The new chat page while it loads, under the layout's back link. The page
// gives its own heading, Today or the form's, once it knows which; until
// then the skeleton sits in a panel under the form's heading.
export default function NewChatLoading(): JSX.Element {
  return (
    <>
      <h1 className="page-heading">{NEW_CHAT_COPY.heading}</h1>
      <div className="panel">
        <LoadingSkeleton
          label={NEW_CHAT_COPY.loading}
          shapes={["line", "cards"]}
        />
      </div>
    </>
  );
}
