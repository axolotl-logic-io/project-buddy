"use client";

import { type JSX, useEffect, useRef } from "react";
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
    <p ref={resultRef} role="status" tabIndex={-1}>
      {RETIREMENT_COPY.retired}
    </p>
  );
}

export { RetirementFeedback };
