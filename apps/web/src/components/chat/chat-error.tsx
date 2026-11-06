"use client";

import Link from "next/link";
import type { JSX } from "react";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { chatFailureCase } from "@/replies/chat-protocol.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

// Why the last request or reply failed, in the user's terms, with a link to
// sign in again when the failure is that she was signed out.
export function ChatError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: (() => void) | undefined;
}): JSX.Element {
  const errorCase = chatFailureCase(error);
  return (
    <Alert boxed={true}>
      <span>{userMessage(errorCase)}</span>
      {errorCase !== "out-of-gold" &&
        errorCase !== "signed-out" &&
        errorCase !== "request-too-large" &&
        errorCase !== "not-found" &&
        onRetry !== undefined && (
          <Button onClick={onRetry} variant="secondary">
            {IMAGE_COPY.retry}
          </Button>
        )}
      {errorCase === "request-too-large" && (
        <Link className="text-link" href="/chat">
          {IMAGE_COPY.newAdventure}
        </Link>
      )}
      {errorCase === "out-of-gold" && <EarnGoldLink />}
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
