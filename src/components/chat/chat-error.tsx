import type { JSX } from "react";
import { chatFailureMessage } from "@/tutor/chat-protocol.ts";

// Why the last request or reply failed, in the user's terms.
export function ChatError({ error }: { error: Error }): JSX.Element {
  return (
    <p className="text-danger text-sm" role="alert">
      {chatFailureMessage(error)}
    </p>
  );
}
