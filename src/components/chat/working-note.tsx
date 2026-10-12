"use client";

import { useAuiState } from "@assistant-ui/react";
import { type ReactNode, useId } from "react";
import { isWorkingNote } from "@/components/chat/working-note-rule.ts";
import { COPY } from "@/ui/copy.ts";

// A run of consecutive text parts of the message in scope, at indices. A
// working note (isWorkingNote) shows quiet and labelled, where it arrived;
// any other run shows as it is.
function TextRun({
  indices,
  children,
}: {
  indices: readonly number[];
  children: ReactNode;
}): ReactNode {
  const isNote = useAuiState(({ message }) => isWorkingNote(message, indices));
  const labelId = useId();
  if (!isNote) {
    return children;
  }
  return (
    <div
      aria-labelledby={labelId}
      className="flex flex-col gap-1 border-line/40 border-l pl-3 text-muted text-sm"
      role="note"
    >
      <p className="font-semibold text-xs" id={labelId}>
        {COPY.chat.workingNote}
      </p>
      {children}
    </div>
  );
}

export { TextRun };
