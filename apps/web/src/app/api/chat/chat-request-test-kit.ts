// For server tests that send a message to POST /api/chat as the signed-in
// test user and read what the route saved. A reply is saved in next/server's
// after(), which Next's own runs only inside a request, so each test file
// that calls the route mocks next/server with this kit's `after` and
// `connection`:
//
//   vi.mock("next/server", async (importOriginal) => {
//     const kit = await import("@/app/api/chat/chat-request-test-kit.ts");
//     return {
//       ...(await importOriginal<typeof import("next/server")>()),
//       after: kit.after,
//       connection: kit.connection,
//     };
//   });
//
// sendChatMessage then waits for the reply's body and every after() task,
// the ones they start included, so what it returns is all the route saved.
import type { UIMessage } from "ai";
import type { AfterTask } from "next/dist/server/after/after.js";
import { z } from "zod";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import { requestWithSession } from "@/test-database/session-test-kit.ts";
import { streamChunks } from "@/tutor/stream-body-test-kit.ts";
import {
  CITE_MANUAL_OUTPUT,
  CITE_MANUAL_TOOL,
} from "@/tutor/tools/cite-manual-contract.ts";

// A citation under a saved reply: the section's label and its link.
type Citation = z.infer<typeof CITE_MANUAL_OUTPUT>["citations"][number];

// A cite_manual call of a saved reply that returned its citations.
const CITE_MANUAL_PART = z.object({
  type: z.literal(`tool-${CITE_MANUAL_TOOL}`),
  state: z.literal("output-available"),
  output: CITE_MANUAL_OUTPUT,
});

// What the route answered to one message.
interface SentMessage {
  readonly status: number;
  // The response body, read to its end.
  readonly body: string;
  // The body's stream chunks, for a reply.
  readonly chunks: ReturnType<typeof streamChunks>;
}

// The after() tasks started and not yet awaited.
const keptTasks: Promise<unknown>[] = [];

// next/server's after(), in a server test: it starts each task at once and
// keeps it for sendChatMessage to await.
function after(task: AfterTask): void {
  if (typeof task === "function") {
    keptTasks.push(Promise.resolve().then(task));
    return;
  }
  keptTasks.push(task);
}

// next/server's connection(), which waits for a request a server test has
// none of.
function connection(): Promise<void> {
  return Promise.resolve();
}

// Waits for every after() task, and for the tasks those tasks start.
async function finishAfterTasks(): Promise<void> {
  if (keptTasks.length === 0) {
    return;
  }
  await Promise.all(keptTasks.splice(0));
  await finishAfterTasks();
}

// Sends text as the test's newest message in the chat with chatId, through
// POST /api/chat with the test's session, and waits until the route has
// saved all it saves: the reply and, if due, the chat's name.
async function sendChatMessage(
  chatId: string,
  text: string,
): Promise<SentMessage> {
  // Imported here, not at the top: the next/server mock imports this kit
  // while the route's own imports wait for that mock.
  const { POST } = await import("@/app/api/chat/route.ts");
  const response = await POST(
    requestWithSession("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: chatId,
        message: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text }],
        },
      }),
    }),
  );
  const body = await response.text();
  await finishAfterTasks();
  return { status: response.status, body, chunks: streamChunks(body) };
}

// The sections a saved reply cites, in its order, from its cite_manual
// calls.
function citedSections(message: UIMessage): Citation[] {
  return message.parts.flatMap((part) => {
    const cited = CITE_MANUAL_PART.safeParse(part);
    if (cited.success) {
      return cited.data.output.citations;
    }
    return [];
  });
}

// The text of a message, its text parts joined by line breaks.
function messageText(message: UIMessage): string {
  return message.parts
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("\n");
}

// A section of a made-up manual page, for a test's own sections
// (testData(user).manualSections), with the URL the app links its citation
// to.
function manualSection(
  page: string,
  anchor: string,
  title: string,
  text: string,
): ManualSection {
  const filePath = `manual/${page}.rst`;
  return { title, text, filePath, anchor, url: manualUrl(filePath, anchor) };
}

export type { Citation, SentMessage };
export {
  after,
  citedSections,
  connection,
  manualSection,
  messageText,
  sendChatMessage,
};
