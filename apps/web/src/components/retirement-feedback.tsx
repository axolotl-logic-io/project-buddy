"use client";

import { type JSX, useEffect, useRef } from "react";
import { Notice } from "@/components/ui/form-message.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";

// Keep keyboard focus stable when the card that submitted retirement goes away.
function RetirementFeedback({
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
    <Notice ref={resultRef} role="status" tabIndex={-1}>
      {RETIREMENT_COPY.retired}
    </Notice>
  );
}

export { RetirementFeedback };
