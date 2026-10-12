import Link from "next/link";
import type { JSX } from "react";
import { Alert } from "@/components/ui/form-message.tsx";
import { type AppErrorCase, userMessage } from "@/errors/app-error.ts";
import { quotaResetsOn, quotaUsedUpMessage } from "@/quota/quota-terms.ts";
import { chatFailureCase } from "@/tutor/chat-protocol.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

// The case's message. A used-up quota names the day it resets, which the
// case, travelling as its name alone, doesn't carry: the quota of the month
// it is now resets.
function failureMessage(errorCase: AppErrorCase): string {
  if (errorCase === "quota-used-up") {
    return quotaUsedUpMessage(quotaResetsOn(new Date()));
  }
  return userMessage(errorCase);
}

// Why the last request or reply failed, in the user's terms, with a link to
// sign in again when the failure is that she was signed out.
export function ChatError({ error }: { error: Error }): JSX.Element {
  const errorCase = chatFailureCase(error);
  return (
    <Alert boxed={true}>
      {failureMessage(errorCase)}
      {errorCase === "signed-out" && (
        <>
          {" "}
          <Link className="text-link" href="/login">
            {PROBLEMS_COPY.signInLink}
          </Link>
        </>
      )}
    </Alert>
  );
}
