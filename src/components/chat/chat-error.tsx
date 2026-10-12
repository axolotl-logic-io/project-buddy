import Link from "next/link";
import type { JSX } from "react";
import { Alert } from "@/components/ui/form-message.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { chatFailureCase } from "@/tutor/chat-protocol.ts";
import { COPY } from "@/ui/copy.ts";

// Why the last request or reply failed, in the user's terms, with a link to
// sign in again when the failure is that she was signed out.
export function ChatError({ error }: { error: Error }): JSX.Element {
  const errorCase = chatFailureCase(error);
  return (
    <Alert boxed={true}>
      {userMessage(errorCase)}
      {errorCase === "signed-out" && (
        <>
          {" "}
          <Link className="text-link" href="/login">
            {COPY.problems.signInLink}
          </Link>
        </>
      )}
    </Alert>
  );
}
