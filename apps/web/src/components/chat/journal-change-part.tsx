"use client";

import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { UndoSection } from "@/components/journal/section-controls.tsx";
import { contentText } from "@/journal/content-text.ts";
import type { readJournalPart } from "@/journal/journal-message.ts";
import { SECTION_OUTPUT } from "@/replies/tools/journal-contract.ts";
import { JOURNAL_SECTIONS_COPY as COPY } from "@/ui/copy/journal.ts";

function JournalChangePart({
  part,
}: {
  readonly part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = SECTION_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  const change = output.data;
  if (change.status === "not-changed") {
    return <p className="text-muted">{COPY.unchanged}</p>;
  }
  return (
    <aside className="card flex flex-col gap-2" aria-label={COPY.changeLabel}>
      <h3>{COPY.sectionVersion(change.content.kind, change.version)}</h3>
      <p>{COPY.before}</p>
      <del className="whitespace-pre-wrap">{contentText(change.before)}</del>
      <p>{COPY.after}</p>
      <ins className="whitespace-pre-wrap no-underline">
        {contentText(change.content)}
      </ins>
      <UndoSection
        projectId={change.projectId}
        kind={change.content.kind}
        version={change.version}
      />
    </aside>
  );
}

function JournalDataPart({
  data,
}: {
  readonly data: NonNullable<ReturnType<typeof readJournalPart>>;
}): JSX.Element {
  return (
    <aside className="card flex flex-col gap-2">
      <p>{data.command}</p>
      <h3>{COPY.preferences}</h3>
      <p className="whitespace-pre-wrap">{contentText(data.content)}</p>
      <p>{COPY.viewed}</p>
      {data.changed === true && (
        <UndoSection
          projectId={data.projectId}
          kind="preferences"
          version={data.version}
        />
      )}
    </aside>
  );
}

export { JournalChangePart, JournalDataPart };
