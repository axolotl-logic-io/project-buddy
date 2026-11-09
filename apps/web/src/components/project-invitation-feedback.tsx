"use client";

import { type JSX, useEffect, useRef } from "react";
import { Notice } from "@/components/ui/form-message.tsx";
import { PROJECT_INVITATION_COPY } from "@/ui/copy/project-invitations.ts";

// The declined invitation is gone; keep its result outside that list.
export function ProjectInvitationFeedback({
  completed,
}: {
  readonly completed: boolean;
}): JSX.Element | null {
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!completed) {
      return;
    }
    resultRef.current?.focus();
    const url = new URL(globalThis.location.href);
    url.searchParams.delete("declined");
    globalThis.history.replaceState(globalThis.history.state, "", url);
  }, [completed]);
  if (!completed) {
    return null;
  }
  return (
    <Notice role="status" tabIndex={-1} ref={resultRef}>
      {PROJECT_INVITATION_COPY.declined}
    </Notice>
  );
}
