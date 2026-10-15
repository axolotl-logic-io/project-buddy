"use client";

import { type JSX, useId } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { CITE_MANUAL_OUTPUT } from "@/tutor/tools/cite-manual-contract.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";

// The manual sections a reply cites, as links named by their labels
// ("Page › Section") that open the manual in a new tab, which each link's
// description says. They render apart from the tutor's prose, so they read
// the same whichever buddy speaks. Nothing shows until the citations
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
        <Icon name="book" />
        {CITATIONS_COPY.heading}
      </p>
      <ul className="flex flex-wrap gap-2">
        {output.data.citations.map(({ label, url }) => (
          <li className="max-w-full" key={url}>
            <Button
              asChild={true}
              className="max-w-full text-sm"
              variant="secondary"
            >
              <a
                aria-describedby={newTabHintId}
                href={url}
                rel="noreferrer"
                target="_blank"
              >
                <span className="wrap-anywhere">{label}</span>
                <Icon name="external" />
              </a>
            </Button>
          </li>
        ))}
      </ul>
      <span hidden={true} id={newTabHintId}>
        {CITATIONS_COPY.opensInNewTab}
      </span>
    </section>
  );
}
