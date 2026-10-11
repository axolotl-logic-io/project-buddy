import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { UPDATE_MEMORY_OUTPUT } from "@/tutor/tools/update-memory-contract.ts";
import { COPY } from "@/ui/copy.ts";

// A change the tutor made to the project's memory, as a notice set apart from
// its words: the text it removed and the text it added. Nothing shows until
// the change is saved.
export function MemoryChangePart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = UPDATE_MEMORY_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  const change = output.data;
  switch (change.status) {
    case "updated":
      return (
        <aside
          aria-label={COPY.memory.changeLabel}
          className="flex flex-col gap-1 rounded border border-line p-3 text-sm"
        >
          <p className="font-medium">{COPY.memory.changed(change.version)}</p>
          {change.oldText !== "" && (
            <p className="flex flex-col">
              <span className="text-muted">{COPY.memory.removed}</span>
              <del className="whitespace-pre-wrap">{change.oldText}</del>
            </p>
          )}
          {change.newText !== "" && (
            <p className="flex flex-col">
              <span className="text-muted">{COPY.memory.added}</span>
              <ins className="whitespace-pre-wrap no-underline">
                {change.newText}
              </ins>
            </p>
          )}
        </aside>
      );
    case "not-applied":
      return <p className="text-muted text-sm">{COPY.memory.notChanged}</p>;
    default:
      return change satisfies never;
  }
}
