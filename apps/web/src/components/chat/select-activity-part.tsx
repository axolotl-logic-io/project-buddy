import type { JSX } from "react";
import { SELECT_ACTIVITY_OUTPUT } from "@/activities/select-activity-contract.ts";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { SELECT_ACTIVITY_COPY } from "@/ui/copy/chat.ts";

// The activity the buddy moved the chat into, as a line where the call
// arrived. A call that entered none shows nothing: the buddy's reply says
// why. Nothing shows until the call has answered.
export function SelectActivityPart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = SELECT_ACTIVITY_OUTPUT.safeParse(part.result);
  if (!output.success || output.data.status !== "entered") {
    return null;
  }
  return (
    <p className="icon-line text-muted text-sm">
      <Icon name="chevron-right" />
      {SELECT_ACTIVITY_COPY.entered(output.data.name)}
    </p>
  );
}
