"use client";

import { type JSX, useEffect, useRef } from "react";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// Confirms a completed deletion at its destination and gives keyboard users
// a stable place to resume after the deleted card or detail page disappears.
export function DeletionFeedback({
  completed,
}: {
  readonly completed: boolean;
}): JSX.Element | null {
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (completed) {
      resultRef.current?.focus();
    }
  }, [completed]);
  if (!completed) {
    return null;
  }
  return (
    <p ref={resultRef} role="status" tabIndex={-1}>
      {PROMPT_COPY.deleted}
    </p>
  );
}
