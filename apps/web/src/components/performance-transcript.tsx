import type { JSX, ReactNode } from "react";
import {
  ConstructAvatar,
  ConstructIllustration,
} from "@/components/constructs/construct-visual.tsx";
import { Markdown } from "@/components/markdown.tsx";
import type { Construct } from "@/constructs/index.ts";
import type {
  Performance,
  PerformanceMessage,
} from "@/performances/performance-store.ts";
import { riteFirstMessage } from "@/rites/rite.ts";

// A reply's head: the construct's portrait and name.
function ReplyHead({
  construct,
}: {
  readonly construct: Construct;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <ConstructAvatar construct={construct} />
      <p className="font-semibold">{construct.name}</p>
    </div>
  );
}

// A message and the reply under it. The composer shows one the same way
// before the server saves it (performance-controls.tsx), so it takes the
// same room once the transcript holds it.
function TranscriptEntry({
  author,
  text,
  head,
  reply,
}: {
  readonly author: string;
  readonly text: string;
  readonly head: ReactNode;
  readonly reply: string;
}): JSX.Element {
  return (
    <>
      <p className="font-semibold">{author}</p>
      <p className="whitespace-pre-wrap break-words">{text}</p>
      {head}
      <Markdown text={reply} running={false} topHeadingLevel={3} />
    </>
  );
}

function PerformanceTranscript({
  performance,
  entries,
  construct,
}: {
  readonly performance: Performance;
  readonly entries: readonly PerformanceMessage[];
  readonly construct: Construct;
}): JSX.Element {
  return (
    <div className="grid gap-3">
      <div className="performance-opening">
        <ConstructIllustration
          construct={construct}
          visualRole="opening"
          decorative={true}
        />
      </div>
      <Markdown
        text={riteFirstMessage(performance.rite, {
          name: performance.listName,
        })}
        running={false}
        topHeadingLevel={3}
      />
      <ol className="performance-entries">
        {entries.map((entry) => (
          <li key={entry.id} className="performance-entry">
            <TranscriptEntry
              author={entry.author}
              text={entry.text}
              head={<ReplyHead construct={construct} />}
              reply={entry.reply}
            />
          </li>
        ))}
      </ol>
      {performance.closing !== null && <p>{performance.closing}</p>}
    </div>
  );
}

export { PerformanceTranscript, ReplyHead, TranscriptEntry };
