"use client";

import { type JSX, useId } from "react";
import { ChatIcon } from "@/components/chat/chat-icon.tsx";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { CITE_MANUAL_OUTPUT } from "@/tutor/tools/cite-manual-contract.ts";
import { COPY } from "@/ui/copy.ts";

// The manual sections a reply cites, as links named by their labels
// ("Page › Section") that open the manual in a new tab, which each link's
// description says. They render apart from the tutor's prose, so they read
// the same whichever persona speaks. Nothing shows until the citations
// arrive, when there are none, or when a link is not into the manual.
export function ManualCitationsPart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const headingId = useId();
  const newTabHintId = useId();
  const output = CITE_MANUAL_OUTPUT.safeParse(part.result);
  if (!output.success || output.data.citations.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby={headingId}
      className="mt-1 flex flex-col gap-2 border-line/40 border-t pt-3"
    >
      <p
        className="flex items-center gap-1.5 font-medium text-muted text-xs uppercase tracking-wide"
        id={headingId}
      >
        <ChatIcon name="book" />
        {COPY.citations.heading}
      </p>
      <ul className="flex flex-wrap gap-2">
        {output.data.citations.map(({ label, url }) => (
          <li className="max-w-full" key={url}>
            <a
              aria-describedby={newTabHintId}
              className="inline-flex max-w-full items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-foreground text-sm shadow-control hover:text-primary hover:underline"
              href={url}
              rel="noreferrer"
              target="_blank"
            >
              <span className="wrap-anywhere">{label}</span>
              <ChatIcon name="external" />
            </a>
          </li>
        ))}
      </ul>
      <span hidden={true} id={newTabHintId}>
        {COPY.citations.opensInNewTab}
      </span>
    </section>
  );
}
