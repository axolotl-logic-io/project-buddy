"use client";

import type { JSX } from "react";
import { SEARCH_BLENDER_MANUAL_INPUT } from "@/blender-manual/search-tool-contract.ts";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { WorkingDots } from "@/components/chat/working-dots.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { extraTag } from "@/flags/flags.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";

// One search of the manual: what the buddy looked for, while and after it
// searches. The sections it found show only where the reply cites them.
export function SearchManualPart({
  part,
}: {
  part: Pick<ToolCallPart, "args" | "result">;
}): JSX.Element | null {
  const input = SEARCH_BLENDER_MANUAL_INPUT.safeParse(part.args);
  if (!input.success) {
    return null;
  }
  const { query } = input.data;
  if (part.result === undefined) {
    return (
      <p className="icon-line text-muted text-sm" {...extraTag("tool-lines")}>
        <Icon name="search" />
        {CITATIONS_COPY.searching(query)}
        <WorkingDots />
      </p>
    );
  }
  return (
    <p className="icon-line text-muted text-sm" {...extraTag("tool-lines")}>
      <Icon name="search" />
      {CITATIONS_COPY.searched(query)}
    </p>
  );
}
