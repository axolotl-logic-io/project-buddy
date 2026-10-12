import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { Icon } from "@/components/ui/icon.tsx";
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
          className="card flex flex-col gap-2 text-sm"
        >
          <p className="icon-line font-medium">
            <Icon name="pencil" />
            {COPY.memory.changed(change.version)}
          </p>
          {change.oldText !== "" && (
            <p className="flex flex-col gap-0.5 border-danger border-l pl-3">
              <span className="text-muted text-xs">{COPY.memory.removed}</span>
              <del className="whitespace-pre-wrap">{change.oldText}</del>
            </p>
          )}
          {change.newText !== "" && (
            <p className="flex flex-col gap-0.5 border-primary border-l pl-3">
              <span className="text-muted text-xs">{COPY.memory.added}</span>
              <ins className="whitespace-pre-wrap no-underline">
                {change.newText}
              </ins>
            </p>
          )}
        </aside>
      );
    case "not-applied":
      return (
        <p className="icon-line text-muted text-sm">
          <Icon name="pencil" />
          {COPY.memory.notChanged}
        </p>
      );
    default:
      return change satisfies never;
  }
}
