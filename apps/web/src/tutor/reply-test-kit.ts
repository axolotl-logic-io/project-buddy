// For the replyToChat tests: stand-ins for the modules a reply depends on,
// fixtures and response readers. A test file replaces the modules with it:
//   vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/quota/quota.ts", () => import("@/tutor/reply-test-kit.ts"));
// and calls resetReplyTestKit() before each test. stream-body-test-kit.ts
// reads the reply's streamed body.
import { streamText, tool, type UIMessage } from "ai";
import type * as nextServer from "next/server";
import { vi } from "vitest";
import { z } from "zod";
import { getBuddy, snapshotOf } from "@/buddies/index.ts";
import type { CentralChat } from "@/chats/chat-rows.ts";
import type * as chatStore from "@/chats/store.ts";
import {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import type * as memoryStore from "@/memory/memory-store.ts";
import type * as quota from "@/quota/quota.ts";
import { quotaGrantFixture } from "@/quota/quota-test-kit.ts";
import type * as chatNaming from "@/tutor/chat-naming.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type * as tutorModelModule from "@/tutor/model.ts";
import { citeManualTool } from "@/tutor/tools/cite-manual.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import type {
  TutorCallSettings,
  TutorToolsReply,
} from "@/tutor/tools/index.ts";
import {
  SEARCH_MANUAL_TOOL,
  type SearchManualOutput,
} from "@/tutor/tools/search-manual-contract.ts";
import {
  TUTOR_TOOL_CONTEXT,
  type TutorToolContext,
} from "@/tutor/tools/tutor-tool-context.ts";

// The text the default model replies with.
const REPLY = "Press Ctrl+B.";

// The signed-in user, whose chat the reply is in.
const OWNER = userIdFixture("3d2c1b0a-9f8e-4d7c-8b6a-5f4e3d2c1b0a");
// The grant checkQuota gives OWNER, within the quota.
const GRANT = quotaGrantFixture(OWNER);
const CHAT_ID = chatIdFixture("6f1c0b52-1c6e-4f3a-9a52-0d3c2b7e8a10");
const PROJECT_ID = projectIdFixture("0b6a1f7e-5d2c-4e8b-9f3a-7c1d2e3f4a5b");

// The owner's central chat, which is in no project.
const CENTRAL_CHAT: CentralChat = {
  kind: "central",
  id: CHAT_ID,
  buddy: snapshotOf(getBuddy("mr-tee")),
  name: undefined,
  renamedByHand: false,
  createdAt: new Date("2026-10-16T09:00:00Z"),
};

const EARLIER_MESSAGES: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [{ type: "text", text: "Hello, fool." }],
  },
];

const NEW_MESSAGE: ChatRequest["message"] = {
  id: messageIdFixture("m3"),
  role: "user",
  parts: [{ type: "text", text: "How do I bevel an edge?" }],
};

// The chats store.
const getChat = vi.fn<typeof chatStore.getChat>();
const listMessages = vi.fn<typeof chatStore.listMessages>();
const saveMessage = vi.fn<typeof chatStore.saveMessage>();
const saveReply = vi.fn<typeof chatStore.saveReply>();
const claimReply = vi.fn<typeof chatStore.claimReply>();
const releaseReply = vi.fn<typeof chatStore.releaseReply>();

// Naming the chat once the reply is saved.
const nameChatIfDue = vi.fn<typeof chatNaming.nameChatIfDue>();

// The memory store, which the prompt reads the project's memory from.
const readMemory = vi.fn<typeof memoryStore.readMemory>();

// The owner's monthly quota, within it unless a test says otherwise.
const checkQuota = vi.fn<typeof quota.checkQuota>();

// The model choice.
const tutorModel = vi.fn<typeof tutorModelModule.tutorModel>();

// The tool list, keyed like the real one: `echo`, so the tests can follow a
// reply through a tool call; `read_context`, which answers with the context
// it was given; and the manual tools, with search_manual always finding
// BEVEL_SECTION and the real cite_manual.
const ECHO_TOOL = "echo";
const READ_CONTEXT_TOOL = "read_context";

const BEVEL_SECTION: SearchManualOutput["sections"][number] = {
  label: "Bevel › Usage",
  url: "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage",
  excerpt: "Press Ctrl+B.",
};

const searchManualStandIn = tool({
  inputSchema: z.object({ query: z.string() }),
  execute: (): SearchManualOutput => ({ sections: [BEVEL_SECTION] }),
});

const echoTool = tool({
  inputSchema: z.object({ word: z.string() }),
  execute: ({ word }: { word: string }): string => `echo: ${word}`,
});

const readContextTool = tool({
  inputSchema: z.object({}),
  contextSchema: TUTOR_TOOL_CONTEXT,
  execute: (
    _input: Record<string, never>,
    { context }: { context: TutorToolContext },
  ): TutorToolContext => context,
});

const TEST_TOOLS: {
  readonly [ECHO_TOOL]: typeof echoTool;
  readonly [READ_CONTEXT_TOOL]: typeof readContextTool;
  readonly [SEARCH_MANUAL_TOOL]: typeof searchManualStandIn;
  readonly [CITE_MANUAL_TOOL]: typeof citeManualTool;
} = {
  [ECHO_TOOL]: echoTool,
  [READ_CONTEXT_TOOL]: readContextTool,
  [SEARCH_MANUAL_TOOL]: searchManualStandIn,
  [CITE_MANUAL_TOOL]: citeManualTool,
};

// The test's tools, whatever the chat's place and the buddy's descriptions,
// in place of tools/index.ts's.
function tutorTools(): typeof TEST_TOOLS {
  return TEST_TOOLS;
}

// tools/index.ts's model calls, with the test's tools and read_context's
// context, as tools/index.ts hands a project chat's over. The central chat's
// tests (reply-central.test.ts) and the project chat's tool context test
// (reply-project-tools.test.ts) use the real tools instead.
function streamTutorCalls(
  { owner, chat }: TutorToolsReply,
  settings: TutorCallSettings,
): ReturnType<typeof streamText<typeof TEST_TOOLS>> {
  if (chat.kind === "central") {
    throw new Error("A central chat's reply tests use the real tools.");
  }
  const context: TutorToolContext = {
    owner,
    chatId: chat.id,
    projectId: chat.projectId,
  };
  return streamText({
    ...settings,
    tools: TEST_TOOLS,
    toolsContext: { [READ_CONTEXT_TOOL]: context },
  });
}

// next/server's after(): it keeps each task for finishReply to await.
const pendingAfterTasks: unknown[] = [];
const after = vi.fn<typeof nextServer.after>((task) => {
  if (typeof task === "function") {
    pendingAfterTasks.push(task());
  } else {
    pendingAfterTasks.push(task);
  }
});

// The reply diagnostics line, silenced; resetReplyTestKit clears it.
const replyStepsLog = vi.spyOn(console, "info").mockImplementation(() => {
  // Tests read the recorded calls; printing them would only add noise.
});

function resetReplyTestKit(): void {
  vi.clearAllMocks();
  pendingAfterTasks.splice(0);
  tutorModel.mockReturnValue(
    mockTutorModel(() => [{ text: REPLY, toolCalls: [] }]),
  );
  getChat.mockResolvedValue({
    kind: "project",
    id: CHAT_ID,
    projectId: PROJECT_ID,
    projectName: "Low-poly fox",
    isInterviewChat: true,
    buddy: snapshotOf(getBuddy("mr-tee")),
    name: undefined,
    renamedByHand: false,
    createdAt: new Date(),
  });
  listMessages.mockResolvedValue(EARLIER_MESSAGES);
  saveMessage.mockResolvedValue("inserted");
  saveReply.mockResolvedValue();
  claimReply.mockResolvedValue(true);
  releaseReply.mockResolvedValue();
  nameChatIfDue.mockResolvedValue();
  readMemory.mockResolvedValue(EMPTY_MEMORY);
  checkQuota.mockResolvedValue({ kind: "withinQuota", grant: GRANT });
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

// The reply the store saved.
function savedReply(): UIMessage | undefined {
  return saveReply.mock.calls[0]?.[2];
}

export {
  after,
  BEVEL_SECTION,
  CENTRAL_CHAT,
  CHAT_ID,
  checkQuota,
  claimReply,
  EARLIER_MESSAGES,
  finishReply,
  finishSaving,
  GRANT,
  getChat,
  listMessages,
  NEW_MESSAGE,
  nameChatIfDue,
  OWNER,
  PROJECT_ID,
  REPLY,
  readMemory,
  releaseReply,
  replyStepsLog,
  resetReplyTestKit,
  savedReply,
  saveMessage,
  saveReply,
  streamTutorCalls,
  tutorModel,
  tutorTools,
};
