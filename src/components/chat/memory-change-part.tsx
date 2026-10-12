import type { JSX } from "react";
import { ChatIcon } from "@/components/chat/chat-icon.tsx";
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
          className="flex flex-col gap-2 rounded-box border border-line bg-surface p-3 text-sm shadow-control"
        >
          <p className="flex items-start gap-2 font-medium">
            <ChatIcon name="pencil" />
            {COPY.memory.changed(change.version)}
          </p>
          {change.oldText !== "" && (
            <p className="flex flex-col gap-0.5 border-danger border-l-2 pl-3">
              <span className="text-muted text-xs">{COPY.memory.removed}</span>
              <del className="whitespace-pre-wrap">{change.oldText}</del>
            </p>
          )}
          {change.newText !== "" && (
            <p className="flex flex-col gap-0.5 border-primary border-l-2 pl-3">
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
        <p className="flex items-start gap-2 text-muted text-sm">
          <ChatIcon name="pencil" />
          {COPY.memory.notChanged}
        </p>
      );
    default:
      return change satisfies never;
  }
}
