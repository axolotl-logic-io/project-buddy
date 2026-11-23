import type { JSX } from "react";
import { ConstructAvatar, ConstructIllustration } from "@/components/constructs/construct-visual.tsx";
import { Markdown } from "@/components/markdown.tsx";
import type { Construct } from "@/constructs/index.ts";
import type {
  Conjuration,
  Performance,
} from "@/performances/performance-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

function PerformanceTranscript({
  performance,
  entries,
  construct,
}: {
  readonly performance: Performance;
  readonly entries: readonly Conjuration[];
  readonly construct: Construct;
}): JSX.Element {
  return (
    <div className="grid gap-3">
      <ConstructIllustration construct={construct} visualRole="opening" decorative={true} />
      <p>
        {PERFORMANCE_COPY.opening(performance.rite.name, performance.spaceName)}
      </p>
      <ol className="grid gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="grid min-w-0 gap-2">
            <p className="font-semibold">{entry.author}</p>
            <p className="whitespace-pre-wrap break-words">{entry.text}</p>
            <div className="flex items-center gap-2">
              <ConstructAvatar construct={construct} />
              <p className="font-semibold">{construct.name}</p>
            </div>
            <Markdown text={entry.reply} running={false} topHeadingLevel={3} />
          </li>
        ))}
      </ol>
      {performance.closing !== null && <p>{performance.closing}</p>}
    </div>
  );
}

export { PerformanceTranscript };
