"use client";

import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { SEARCH_MANUAL_INPUT } from "@/tutor/tools/search-manual-contract.ts";
import { COPY } from "@/ui/copy.ts";

function searchLine(
  query: string,
  { result, isError }: Pick<ToolCallPart, "result" | "isError">,
): string {
  if (isError === true) {
    return COPY.citations.searchFailed(query);
  }
  if (result === undefined) {
    return COPY.citations.searching(query);
  }
  return COPY.citations.searched(query);
}

// One search of the manual: what the tutor looked for, while and after it
// searches. The sections it found show only where the reply cites them.
export function SearchManualPart({
  part,
}: {
  part: Pick<ToolCallPart, "args" | "result" | "isError">;
}): JSX.Element | null {
  const input = SEARCH_MANUAL_INPUT.safeParse(part.args);
  if (!input.success) {
    return null;
  }
  return (
    <p className="text-muted text-sm">{searchLine(input.data.query, part)}</p>
  );
}
