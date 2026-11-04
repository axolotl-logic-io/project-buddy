"use client";

import { type JSX, useEffect, useRef } from "react";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

export function DeletionStatus(): JSX.Element {
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    statusRef.current?.focus();
  }, []);
  return (
    <p className="status-text" role="status" tabIndex={-1} ref={statusRef}>
      {PROMPT_COPY.deleted}
    </p>
  );
}
