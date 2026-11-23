// A performance and its conjurations, shaped as the performance store
// returns them, and the performance as the quest page shows it: the
// transcript inside the composer, for the browser tests of the transcript,
// the composer and the quest page.

import type { JSX } from "react";
import { z } from "zod";
import { Conjure } from "@/components/performance-controls.tsx";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import type { Construct } from "@/constructs/index.ts";
import type { QuestId, UserId } from "@/ids.ts";
import type {
  Conjuration,
  Performance,
} from "@/performances/performance-store.ts";
import { SPACE_ID } from "@/spaces/space.ts";

// The store's id schema, since the browser tests mock the store module.
const PERFORMANCE_ID = z.guid().toLowerCase().brand<"PerformanceId">();

const PERFORMANCE: Performance = {
  id: PERFORMANCE_ID.parse("0b6c1d55-2f0e-4b8a-9c3d-6e7f8a9b0c1d"),
  spaceId: SPACE_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513"),
  spaceName: "Bench",
  rite: { name: "Brainstorm", replies: ["What else comes to mind?"] },
  startedAt: new Date("2026-11-20T09:00:00Z"),
  endedAt: null,
  added: 0,
  closing: null,
};

// A reply laid out with a heading, emphasis, both kinds of list, a table, a
// link to a manual and a Python block.
const MARKDOWN_REPLY = [
  "## Beveling an edge",
  "A bevel *rounds* a hard edge.",
  "1. Select the edge.\n2. Press **Ctrl+B** and move the mouse.",
  "- Scroll to add segments.\n- Click to confirm.",
  "| Key | Action |\n| --- | --- |\n| Ctrl+B | Bevel |",
  "Read more in [the manual](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#bevel).",
  "```python\nimport bpy\nbpy.ops.mesh.bevel(offset=0.1)\n```",
].join("\n\n");

// A saved conjuration by author, with the rite's reply.
function conjuration(
  text: string,
  reply: string,
  author = "Robin",
  id: string = crypto.randomUUID(),
): Conjuration {
  return {
    id,
    author,
    text,
    reply,
    added: 1,
    createdAt: new Date("2026-11-20T09:05:00Z"),
  };
}

// The active performance as the quest page shows it to viewer, who
// conjures as author.
function performanceView({
  performance = PERFORMANCE,
  questId,
  viewer,
  construct,
  entries,
  author = "Robin",
}: {
  readonly performance?: Performance;
  readonly questId: QuestId;
  readonly viewer: UserId;
  readonly construct: Construct;
  readonly entries: readonly Conjuration[];
  readonly author?: string;
}): JSX.Element {
  return (
    <Conjure
      questId={questId}
      performanceId={performance.id}
      viewer={viewer}
      author={author}
      construct={construct}
      answered={entries.map((entry) => entry.id)}
    >
      <PerformanceTranscript
        performance={performance}
        entries={entries}
        construct={construct}
      />
    </Conjure>
  );
}

export {
  conjuration,
  MARKDOWN_REPLY,
  PERFORMANCE,
  PERFORMANCE_ID,
  performanceView,
};
