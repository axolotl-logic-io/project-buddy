// What replyToChat's answer-now call (answer-now.ts) sends: the reply's
// whole conversation so far, every tool call and result included, then the
// app's note, both to the model and, through Anthropic's provider, to
// Claude. In the persona-names smoke test the call got none of the reply's
// searches, and Claude said it hadn't checked the manual. Also what Claude
// reads after cite_manual, the call that ended empty there.
import { createAnthropic } from "@ai-sdk/anthropic";
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
} from "@ai-sdk/provider";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { messageIdFixture } from "@/id-fixtures.ts";
import { isAnswerNowNote } from "@/tutor/answer-now.ts";
import {
  claudePlaying,
  loggedReply,
  OBSERVED_SEQUENCE,
  reply,
  savedPartTypes,
  savedText,
  scriptAnsweringNote,
} from "@/tutor/answer-now-test-kit.ts";
import { mockEmptyAfterSearchAnswer } from "@/tutor/mock-empty-after-search.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  BEVEL_SECTION,
  CHAT_ID,
  finishReply,
  OWNER,
  resetReplyTestKit,
  savedReply,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";
import { streamedText } from "@/tutor/stream-body-test-kit.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import {
  SEARCH_MANUAL_TOOL,
  type SearchManualOutput,
} from "@/tutor/tools/search-manual-contract.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("@/tutor/reply-test-kit.ts"));

// What each search_manual call returns in these tests.
const SEARCH_OUTPUT: SearchManualOutput = { sections: [BEVEL_SECTION] };
const SEARCH_OUTPUT_TEXT: string = JSON.stringify(SEARCH_OUTPUT);
// The model the kit's Claude parts name.
const CLAUDE_MODEL_ID = "claude-sonnet-5-5";

// The blocks of an Anthropic request body these tests read.
const CLAUDE_BLOCK = z.looseObject({ type: z.string() });
const CLAUDE_TOOL_USE = z.object({
  type: z.literal("tool_use"),
  name: z.string(),
});
const CLAUDE_TOOL_RESULT = z.object({
  type: z.literal("tool_result"),
  content: z.string(),
});
const CLAUDE_REQUEST = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.array(CLAUDE_BLOCK),
    }),
  ),
});

type ClaudeRequest = z.infer<typeof CLAUDE_REQUEST>;
type ClaudeBlock = z.infer<typeof CLAUDE_BLOCK>;

// The tool calls and results in prompt, in order, as "<type>:<tool name>".
function toolPartsOf(prompt: LanguageModelV4Prompt): string[] {
  return prompt.flatMap((message) => {
    if (message.role !== "assistant" && message.role !== "tool") {
      return [];
    }
    return message.content.flatMap((part) => {
      if (part.type === "tool-call" || part.type === "tool-result") {
        return [`${part.type}:${part.toolName}`];
      }
      return [];
    });
  });
}

// The outputs of the search_manual results in prompt.
function searchOutputsOf(prompt: LanguageModelV4Prompt): unknown[] {
  return prompt.flatMap((message) => {
    if (message.role !== "tool") {
      return [];
    }
    return message.content.flatMap((part) => {
      if (part.type === "tool-result" && part.toolName === SEARCH_MANUAL_TOOL) {
        return [part.output];
      }
      return [];
    });
  });
}

// The answer-now call's options, as the model received them.
function answerNowCall(
  calls: readonly LanguageModelV4CallOptions[],
): LanguageModelV4CallOptions {
  const call = calls.at(-1);
  if (call === undefined) {
    throw new Error("The model was never called.");
  }
  return call;
}

// The request body Anthropic's provider sends Claude for call, read from a
// stand-in for fetch that answers every request with an error.
async function claudeRequest(
  call: LanguageModelV4CallOptions,
): Promise<ClaudeRequest> {
  const bodies: unknown[] = [];
  const claude = createAnthropic({
    apiKey: "test-key",
    fetch: (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      bodies.push(init?.body);
      return Promise.resolve(new Response("{}", { status: 400 }));
    },
  })(CLAUDE_MODEL_ID);
  try {
    await claude.doStream(call);
  } catch {
    // The stand-in fails every request once it has the body.
  }
  return CLAUDE_REQUEST.parse(JSON.parse(String(bodies[0])));
}

// The names of the tools blocks call, in order.
function toolUseNames(blocks: readonly ClaudeBlock[]): string[] {
  return blocks.flatMap((block) => {
    const use = CLAUDE_TOOL_USE.safeParse(block);
    if (use.success) {
      return [use.data.name];
    }
    return [];
  });
}

// The contents of the tool results in blocks, in order.
function toolResultContents(blocks: readonly ClaudeBlock[]): string[] {
  return blocks.flatMap((block) => {
    const result = CLAUDE_TOOL_RESULT.safeParse(block);
    if (result.success) {
      return [result.data.content];
    }
    return [];
  });
}

// The error log, silenced for the whole file; resetReplyTestKit clears it.
spyOnErrorLog();

beforeEach(() => {
  resetReplyTestKit();
});

describe("replyToChat answer-now call to the model", () => {
  test("gets every tool call and whole result of the reply, then the note", async () => {
    const model = claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));

    await finishReply(await reply());

    const { prompt } = answerNowCall(model.doStreamCalls);
    expect(toolPartsOf(prompt)).toEqual([
      `tool-call:${SEARCH_MANUAL_TOOL}`,
      `tool-result:${SEARCH_MANUAL_TOOL}`,
      `tool-call:${SEARCH_MANUAL_TOOL}`,
      `tool-result:${SEARCH_MANUAL_TOOL}`,
      `tool-call:${CITE_MANUAL_TOOL}`,
      `tool-result:${CITE_MANUAL_TOOL}`,
    ]);
    expect(searchOutputsOf(prompt)).toEqual([
      { type: "json", value: SEARCH_OUTPUT },
      { type: "json", value: SEARCH_OUTPUT },
    ]);
    expect(prompt.map(isAnswerNowNote).indexOf(true)).toBe(prompt.length - 1);
  });
});

describe("replyToChat answer-now request to Claude", () => {
  test("holds every search result whole and the thinking, then the note", async () => {
    const model = claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));
    await finishReply(await reply());

    const { messages } = await claudeRequest(
      answerNowCall(model.doStreamCalls),
    );

    const blocks = messages.flatMap(({ content }) => content);
    expect(toolUseNames(blocks)).toEqual([
      SEARCH_MANUAL_TOOL,
      SEARCH_MANUAL_TOOL,
      CITE_MANUAL_TOOL,
    ]);
    expect(
      toolResultContents(blocks).filter((text) => text === SEARCH_OUTPUT_TEXT),
    ).toHaveLength(2);
    expect(blocks.map(({ type }) => type)).toContain("thinking");
    expect(messages.every(({ content }) => content.length > 0)).toBe(true);
    expect(messages.at(-1)?.role).toBe("user");
    expect(JSON.stringify(blocks.at(-1))).toContain("note from the app");
  });
});

// The model call right after cite_manual in OBSERVED_SEQUENCE.
const CALL_AFTER_CITE = 3;

describe("replyToChat request to Claude after cite_manual", () => {
  test("holds the citations and the reminder to write the answer, while the chat's part keeps the citations alone", async () => {
    const model = claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));
    await finishReply(await reply());
    const call = model.doStreamCalls[CALL_AFTER_CITE];
    if (call === undefined) {
      throw new Error("The call after cite_manual never ran.");
    }

    const { messages } = await claudeRequest(call);

    const citeResult = toolResultContents(
      messages.flatMap(({ content }) => content),
    ).find((text) => text.includes('"citations"'));
    expect(citeResult).toContain(BEVEL_SECTION.url);
    expect(citeResult).toContain(BEVEL_SECTION.label);
    expect(citeResult).toContain(
      "The app will show these links under your reply.",
    );
    expect(citeResult).toContain("write it now, after this call");
    expect(savedReply()?.parts).toContainEqual(
      expect.objectContaining({
        type: `tool-${CITE_MANUAL_TOOL}`,
        output: {
          citations: [{ label: BEVEL_SECTION.label, url: BEVEL_SECTION.url }],
        },
      }),
    );
  });
});

describe("replyToChat with /mock-empty-after-search", () => {
  test("answers from the search results in the answer-now call, under its citations", async () => {
    tutorModel.mockReturnValue(mockTutorModel());

    const body = await finishReply(
      await replyToChat(OWNER, {
        chatId: CHAT_ID,
        message: {
          id: messageIdFixture(),
          role: "user",
          parts: [{ type: "text", text: "/mock-empty-after-search bevel" }],
        },
      }),
    );

    const answer = mockEmptyAfterSearchAnswer("bevel", [BEVEL_SECTION.label]);
    expect(streamedText(body)).toBe(answer);
    expect(savedText()).toBe(answer);
    expect(savedPartTypes()).toEqual([
      "step-start",
      `tool-${SEARCH_MANUAL_TOOL}`,
      "step-start",
      `tool-${CITE_MANUAL_TOOL}`,
      "step-start",
      "step-start",
      "text",
    ]);
    expect(loggedReply()).toMatchObject({ answerNow: true });
  });
});
