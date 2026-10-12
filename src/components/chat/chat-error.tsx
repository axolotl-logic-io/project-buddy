import Link from "next/link";
import type { JSX } from "react";
import { ChatIcon } from "@/components/chat/chat-icon.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { chatFailureCase } from "@/tutor/chat-protocol.ts";
import { COPY } from "@/ui/copy.ts";

// Why the last request or reply failed, in the user's terms, with a link to
// sign in again when the failure is that she was signed out.
export function ChatError({ error }: { error: Error }): JSX.Element {
  const errorCase = chatFailureCase(error);
  return (
    <p
      className="flex items-start gap-2 rounded-box border border-danger bg-surface px-4 py-3 text-danger text-sm"
      role="alert"
    >
      <ChatIcon name="warning" />
      <span>
        {userMessage(errorCase)}
        {errorCase === "signed-out" && (
          <>
            {" "}
            <Link
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              href="/login"
            >
              {COPY.problems.signInLink}
            </Link>
          </>
        )}
      </span>
    </p>
  );
}
