// For the replyToChat tests: stand-ins for the modules a reply depends on,
// fixtures, and readers for the reply's response. A test file replaces the
// modules with this one:
//   vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
// and calls resetReplyTestKit() before each test.
import { type ToolSet, tool, type UIMessage } from "ai";
import type * as nextServer from "next/server";
import { vi } from "vitest";
import { z } from "zod";
import type * as chatStore from "@/chats/store.ts";
import { parseChatId, parseProjectId } from "@/ids.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type * as tutorModelModule from "@/tutor/model.ts";

const STREAM_DATA_PREFIX = "data: ";
const STREAM_CHUNK = z.looseObject({ type: z.string() });
const TEXT_DELTA = z.object({
  type: z.literal("text-delta"),
  delta: z.string(),
});

// The text the default model replies with.
const REPLY = "Press Ctrl+B.";

function fixtureIds(): { chatId: ChatRequest["chatId"]; projectId: string } {
  const chatId = parseChatId("6f1c0b52-1c6e-4f3a-9a52-0d3c2b7e8a10");
  const projectId = parseProjectId("0b6a1f7e-5d2c-4e8b-9f3a-7c1d2e3f4a5b");
  if (chatId === undefined || projectId === undefined) {
    throw new Error("The fixture ids are malformed");
  }
  return { chatId, projectId };
}

const { chatId: CHAT_ID, projectId: PROJECT_ID } = fixtureIds();

const EARLIER_MESSAGES: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [{ type: "text", text: "Hello, fool." }],
  },
];

const NEW_MESSAGE: ChatRequest["message"] = {
  id: "m3",
  role: "user",
  parts: [{ type: "text", text: "How do I bevel an edge?" }],
};

// The chats store.
const getChat = vi.fn<typeof chatStore.getChat>();
const listMessages = vi.fn<typeof chatStore.listMessages>();
const saveMessage = vi.fn<typeof chatStore.saveMessage>();

// The model choice.
const tutorModel = vi.fn<typeof tutorModelModule.tutorModel>();

// The tool list: one tool, so the tests can follow a reply through a tool
// call.
const TUTOR_TOOLS: ToolSet = {
  echo: tool({
    inputSchema: z.object({ word: z.string() }),
    execute: ({ word }: { word: string }): string => `echo: ${word}`,
  }),
};

// next/server's after(): it keeps each task for finishReply to await.
const pendingAfterTasks: unknown[] = [];
const after = vi.fn<typeof nextServer.after>((task) => {
  if (typeof task === "function") {
    pendingAfterTasks.push(task());
  } else {
    pendingAfterTasks.push(task);
  }
});

function resetReplyTestKit(): void {
  vi.clearAllMocks();
  pendingAfterTasks.splice(0);
  tutorModel.mockReturnValue(
    mockTutorModel(() => [{ text: REPLY, toolCalls: [] }]),
  );
  getChat.mockResolvedValue({
    id: CHAT_ID,
    projectId: PROJECT_ID,
    projectName: "Low-poly fox",
    personaId: "mr-t",
    createdAt: new Date(),
  });
  listMessages.mockResolvedValue(EARLIER_MESSAGES);
  saveMessage.mockResolvedValue();
}

// The response body, once the reply and its save have finished.
async function finishReply(response: Response): Promise<string> {
  const body = await response.text();
  await Promise.all(pendingAfterTasks.splice(0));
  return body;
}

// Waits for the reply's save without reading the response.
async function finishSaving(): Promise<void> {
  await Promise.all(pendingAfterTasks.splice(0));
}

// The chunks of a UI message stream body.
function streamChunks(body: string): z.infer<typeof STREAM_CHUNK>[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith(`${STREAM_DATA_PREFIX}{`))
    .map((line) =>
      STREAM_CHUNK.parse(JSON.parse(line.slice(STREAM_DATA_PREFIX.length))),
    );
}

// The text a UI message stream body streams, joined.
function streamedText(body: string): string {
  return streamChunks(body)
    .flatMap((chunk) => {
      const delta = TEXT_DELTA.safeParse(chunk);
      if (delta.success) {
        return [delta.data.delta];
      }
      return [];
    })
    .join("");
}

// The reply the store saved after the user's message.
function savedReply(): UIMessage | undefined {
  return saveMessage.mock.calls[1]?.[1];
}

export {
  after,
  CHAT_ID,
  finishReply,
  finishSaving,
  getChat,
  listMessages,
  NEW_MESSAGE,
  REPLY,
  resetReplyTestKit,
  savedReply,
  saveMessage,
  streamChunks,
  streamedText,
  TUTOR_TOOLS,
  tutorModel,
};
