"use client";

import { type JSX, useId } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { CITE_MANUAL_OUTPUT } from "@/tutor/tools/cite-manual-contract.ts";
import { COPY } from "@/ui/copy.ts";

// The manual sections a reply cites, as links that open the manual in a new
// tab. They render apart from the tutor's prose, so they read the same
// whichever persona speaks. Nothing shows until the citations arrive, or
// when there are none.
export function ManualCitationsPart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const headingId = useId();
  const output = CITE_MANUAL_OUTPUT.safeParse(part.result);
  if (!output.success || output.data.citations.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <p className="text-muted text-sm" id={headingId}>
        {COPY.citations.heading}
      </p>
      <ul className="flex flex-col gap-1">
        {output.data.citations.map(({ title, url }) => (
          <li key={url}>
            <a
              className="text-link"
              href={url}
              rel="noreferrer"
              target="_blank"
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
