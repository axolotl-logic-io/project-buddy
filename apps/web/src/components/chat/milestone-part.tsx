import Link from "next/link";
import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { RECORD_MILESTONE_OUTPUT } from "@/replies/tools/record-milestone-contract.ts";
import { MILESTONE_COPY } from "@/ui/copy/milestones.ts";

// A milestone the construct added to the project's progress timeline, as a
// notice set apart from its words: what the user got done, and a link to the
// timeline on the project's page. Nothing shows until it is recorded.
export function MilestonePart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = RECORD_MILESTONE_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  const milestone = output.data;
  return (
    <aside
      aria-label={MILESTONE_COPY.recordedLabel}
      className="card flex flex-col gap-2 text-sm"
    >
      <p className="icon-line text-muted">
        <Icon name="flag" />
        {MILESTONE_COPY.recorded}
      </p>
      <p className="font-medium">{milestone.text}</p>
      <Link
        className="self-start text-link"
        href={`/projects/${milestone.projectId}`}
      >
        {MILESTONE_COPY.timelineLink}
      </Link>
    </aside>
  );
}
