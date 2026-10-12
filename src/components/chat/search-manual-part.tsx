"use client";

import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { WorkingDots } from "@/components/chat/working-dots.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { SEARCH_MANUAL_INPUT } from "@/tutor/tools/search-manual-contract.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";

// One search of the manual: what the tutor looked for, while and after it
// searches. The sections it found show only where the reply cites them.
export function SearchManualPart({
  part,
}: {
  part: Pick<ToolCallPart, "args" | "result">;
}): JSX.Element | null {
  const input = SEARCH_MANUAL_INPUT.safeParse(part.args);
  if (!input.success) {
    return null;
  }
  const { query } = input.data;
  if (part.result === undefined) {
    return (
      <p className="icon-line text-muted text-sm">
        <Icon name="search" />
        {CITATIONS_COPY.searching(query)}
        <WorkingDots />
      </p>
    );
  }
  return (
    <p className="icon-line text-muted text-sm">
      <Icon name="search" />
      {CITATIONS_COPY.searched(query)}
    </p>
  );
}
