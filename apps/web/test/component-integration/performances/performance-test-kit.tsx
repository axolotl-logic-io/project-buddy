// A performance and its messages, shaped as the performance store
// returns them, and the performance as the quest page shows it: the
// transcript inside the composer, for the browser tests of the transcript,
// the composer and the quest page.

import type { JSX } from "react";
import { MessageComposer } from "@/components/performance-controls.tsx";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import type { Construct } from "@/constructs/index.ts";
import { PERFORMANCE_ID, type QuestId, type UserId } from "@/ids.ts";
import { LIST_ID } from "@/lists/list.ts";
import type {
  Performance,
  PerformanceMessage,
} from "@/performances/performance-store.ts";

const PERFORMANCE: Performance = {
  id: PERFORMANCE_ID.parse("0b6c1d55-2f0e-4b8a-9c3d-6e7f8a9b0c1d"),
  listId: LIST_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513"),
  listName: "Bench",
  listType: "plain",
  rite: {
    name: "Brainstorm",
    firstMessage: "Let’s brainstorm for {list}. What comes to mind first?",
    replies: ["What else comes to mind?"],
    order: "random",
    loop: true,
    finalReply: "",
  },
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

// A saved message by author, with the rite's reply.
function sentMessage(
  text: string,
  reply: string,
  author = "Robin",
  id: string = crypto.randomUUID(),
): PerformanceMessage {
  return {
    id,
    author,
    text,
    reply,
    replyIndex: 0,
    added: 1,
    createdAt: new Date("2026-11-20T09:05:00Z"),
  };
}

// The active performance as the quest page shows it to viewer, who
// sends messages as author.
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
  readonly entries: readonly PerformanceMessage[];
  readonly author?: string;
}): JSX.Element {
  return (
    <MessageComposer
      questId={questId}
      performance={performance}
      viewer={viewer}
      author={author}
      construct={construct}
      answered={entries.map((entry) => entry.id)}
      given={entries.flatMap((entry) => entry.replyIndex ?? [])}
    >
      <PerformanceTranscript
        performance={performance}
        entries={entries}
        construct={construct}
      />
    </MessageComposer>
  );
}

export { MARKDOWN_REPLY, PERFORMANCE, performanceView, sentMessage };
