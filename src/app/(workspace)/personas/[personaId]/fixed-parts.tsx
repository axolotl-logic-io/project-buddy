import type { JSX } from "react";
import { MEMORY_END_TAG, MEMORY_START_TAG } from "@/tutor/memory-prompt.ts";
import { TOOL_INPUT_FIELDS } from "@/tutor/tools/input-fields.ts";
import { PERSONA_COPY } from "@/ui/copy/personas.ts";

const FIXED_HEADING_ID = "fixed-parts-heading";

// The memory's tags as the prompt holds them, around the memory.
const MEMORY_TAGS = [MEMORY_START_TAG, "…", MEMORY_END_TAG].join("\n");

// The parts of every persona's prompt that no persona changes, read-only:
// the parts filled in for each chat, the tools' input fields, and the
// memory's tags.
export function FixedParts(): JSX.Element {
  return (
    <section aria-labelledby={FIXED_HEADING_ID} className="flex flex-col gap-4">
      <h2 className="section-heading" id={FIXED_HEADING_ID}>
        {PERSONA_COPY.fixedHeading}
      </h2>
      <div className="panel flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="card-title">{PERSONA_COPY.dynamicHeading}</h3>
          <p className="text-muted">{PERSONA_COPY.dynamicIntro}</p>
          <ul className="list-disc pl-5">
            {PERSONA_COPY.dynamicParts.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="card-title">{PERSONA_COPY.toolFieldsHeading}</h3>
          <p className="text-muted">{PERSONA_COPY.toolFieldsIntro}</p>
          <dl className="flex flex-col gap-3">
            {TOOL_INPUT_FIELDS.flatMap(({ tool, fields }) =>
              fields.map(({ name, description }) => (
                <div key={`${tool}.${name}`}>
                  <dt className="font-mono text-sm">{`${tool}: ${name}`}</dt>
                  <dd>{description}</dd>
                </div>
              )),
            )}
          </dl>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="card-title">{PERSONA_COPY.memoryTagsHeading}</h3>
          <p className="text-muted">{PERSONA_COPY.memoryTagsIntro}</p>
          <pre className="font-mono text-sm">{MEMORY_TAGS}</pre>
        </div>
      </div>
    </section>
  );
}
