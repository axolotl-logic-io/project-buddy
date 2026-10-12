// For the replyToChat tests: stand-ins for the modules a reply depends on,
// fixtures, and readers for the reply's response. A test file replaces the
// modules with this one:
//   vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));
//   vi.mock("@/quota/quota.ts", () => import("@/tutor/reply-test-kit.ts"));
// and calls resetReplyTestKit() before each test. stream-body-test-kit.ts
// reads the reply's streamed body.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";
import { type streamText, tool, type UIMessage } from "ai";
import type * as nextServer from "next/server";
import { vi } from "vitest";
import { z } from "zod";
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
import type * as chatNaming from "@/tutor/chat-naming.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type * as tutorModelModule from "@/tutor/model.ts";
import { citeManualTool } from "@/tutor/tools/cite-manual.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
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
const CHAT_ID = chatIdFixture("6f1c0b52-1c6e-4f3a-9a52-0d3c2b7e8a10");
const PROJECT_ID = projectIdFixture("0b6a1f7e-5d2c-4e8b-9f3a-7c1d2e3f4a5b");

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

const TUTOR_TOOLS: {
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

// The tools' context, as tools/index.ts hands it over.
function tutorToolsContext(
  context: TutorToolContext,
): Pick<Parameters<typeof streamText<typeof TUTOR_TOOLS>>[0], "toolsContext"> {
  return { toolsContext: { [READ_CONTEXT_TOOL]: context } };
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

// Claude's parts that the mock model doesn't make, at the start of a model
// call: the provider's call-start part, and a thinking block whose text is
// empty and holds only its signature, as Claude Sonnet 5.5 sends it.
function claudeCallStart(call: number): LanguageModelV4StreamPart[] {
  const reasoningId = `reasoning-${call}`;
  return [
    {
      type: "custom",
      kind: "anthropic.message_start",
      providerMetadata: { anthropic: { model: "claude-sonnet-5-5" } },
    },
    { type: "reasoning-start", id: reasoningId },
    {
      type: "reasoning-delta",
      id: reasoningId,
      delta: "",
      providerMetadata: { anthropic: { signature: `signature-${call}` } },
    },
    { type: "reasoning-end", id: reasoningId },
  ];
}

// model, with Claude's parts and any extra parts at the start of every call.
function withClaudeParts(
  model: LanguageModelV4,
  extraParts: readonly LanguageModelV4StreamPart[] = [],
): LanguageModelV4 {
  let call = 0;
  return {
    ...model,
    doStream: async (
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4StreamResult> => {
      const result = await model.doStream(options);
      call += 1;
      const parts = [...claudeCallStart(call), ...extraParts];
      return {
        ...result,
        stream: result.stream.pipeThrough(
          new TransformStream<
            LanguageModelV4StreamPart,
            LanguageModelV4StreamPart
          >({
            transform: (
              part: LanguageModelV4StreamPart,
              controller: TransformStreamDefaultController<LanguageModelV4StreamPart>,
            ): void => {
              controller.enqueue(part);
              if (part.type === "stream-start") {
                for (const claudePart of parts) {
                  controller.enqueue(claudePart);
                }
              }
            },
          }),
        ),
      };
    },
  };
}

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
    id: CHAT_ID,
    projectId: PROJECT_ID,
    projectName: "Low-poly fox",
    personaId: "mr-tee",
    name: undefined,
    renamedByHand: false,
    createdAt: new Date(),
  });
  listMessages.mockResolvedValue(EARLIER_MESSAGES);
  saveMessage.mockResolvedValue("saved");
  saveReply.mockResolvedValue();
  nameChatIfDue.mockResolvedValue();
  readMemory.mockResolvedValue(EMPTY_MEMORY);
  checkQuota.mockResolvedValue({ kind: "withinQuota" });
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
  CHAT_ID,
  checkQuota,
  finishReply,
  finishSaving,
  getChat,
  listMessages,
  NEW_MESSAGE,
  nameChatIfDue,
  OWNER,
  PROJECT_ID,
  REPLY,
  readMemory,
  replyStepsLog,
  resetReplyTestKit,
  savedReply,
  saveMessage,
  saveReply,
  TUTOR_TOOLS,
  tutorModel,
  tutorToolsContext,
  withClaudeParts,
};
