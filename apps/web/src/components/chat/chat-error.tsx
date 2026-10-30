"use client";

import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { type ChatFailure, readChatFailure } from "@/replies/chat-protocol.ts";
import { quotaUsedUpMessage } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

// The failure's message. A used-up quota names the day the server said it
// resets, or no day if the server didn't say: the browser's own clock may
// be in another month.
function failureMessage(failure: ChatFailure): string {
  if (failure.errorCase !== "quota-used-up") {
    return userMessage(failure.errorCase);
  }
  if (failure.resetsOn === undefined) {
    return userMessage(failure.errorCase);
  }
  return quotaUsedUpMessage(failure.resetsOn);
}

// Why the last request or reply failed, in the user's terms, with a link to
// sign in again when the failure is that she was signed out.
export function ChatError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: (() => void) | undefined;
}): JSX.Element {
  const failure = readChatFailure(error);
  return (
    <Alert boxed={true}>
      <span>{failureMessage(failure)}</span>
      {failure.errorCase !== "quota-used-up" &&
        failure.errorCase !== "signed-out" &&
        onRetry !== undefined && (
          <Button onClick={onRetry} variant="secondary">
            {IMAGE_COPY.retry}
          </Button>
        )}
      {failure.errorCase === "signed-out" && (
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
