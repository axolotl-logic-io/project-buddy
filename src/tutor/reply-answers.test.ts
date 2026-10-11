// How replyToChat makes sure a reply ends with text the user can see. On
// Claude Sonnet 5.5 a reply can end without any: its text before a tool call
// may arrive as an empty thinking block, and it may end with an empty model
// call (Stage 2 smoke test, step 4) or run out of model calls mid-search.
import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type { MockScript, MockStep } from "@/tutor/mock-script.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  BEVEL_SECTION,
  CHAT_ID,
  finishReply,
  NEW_MESSAGE,
  replyStepsLog,
  resetReplyTestKit,
  savedReply,
  saveMessage,
  saveReply,
  streamedText,
  tutorModel,
  withClaudeParts,
} from "@/tutor/reply-test-kit.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

const ANSWER = "Select the edges, then press Ctrl+B and drag.";
// The reply's model-call limit, and the one answer-now call after it.
const MAX_STEPS = 8;
const STEP_LIMIT_CALLS: number = MAX_STEPS + 1;
// A word of the hidden note that no reply in these tests uses.
const NOTE_WORD = "note from the app";

const SEARCH: MockStep = {
  text: "",
  toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } }],
};
const CITE: MockStep = {
  text: "",
  toolCalls: [
    { toolName: CITE_MANUAL_TOOL, input: { urls: [BEVEL_SECTION.url] } },
  ],
};
const EMPTY: MockStep = { text: "", toolCalls: [] };

// Plays `steps` for the user's question, and answers with ANSWER when asked
// again by any other user message, such as the app's hidden note.
function scriptAnsweringNote(steps: readonly MockStep[]): MockScript {
  return (userText: string): readonly MockStep[] => {
    if (userText === NEW_MESSAGE.parts[0]?.text) {
      return steps;
    }
    return [{ text: ANSWER, toolCalls: [] }];
  };
}

// Has the model play script, with Claude's padding parts, and records its
// calls.
function claudePlaying(script: MockScript): MockLanguageModelV4 {
  const model = new MockLanguageModelV4({
    doStream: withClaudeParts(mockTutorModel(script)).doStream,
  });
  tutorModel.mockReturnValue(model);
  return model;
}

function reply(): Promise<Response> {
  return replyToChat({ chatId: CHAT_ID, message: NEW_MESSAGE });
}

function savedPartTypes(): string[] {
  return (savedReply()?.parts ?? []).map((part) => part.type);
}

function savedText(): string {
  return (savedReply()?.parts ?? [])
    .flatMap((part: UIMessage["parts"][number]) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("");
}

// The reply's diagnostics line, parsed.
function loggedReply(): unknown {
  const [, json] = replyStepsLog.mock.calls[0] ?? [];
  return JSON.parse(String(json));
}

// The error log, silenced for the whole file; resetReplyTestKit clears it.
spyOnErrorLog();

beforeEach(() => {
  resetReplyTestKit();
});

// The Stage 2 smoke test's sequence: searches, signature-only thinking,
// cite_manual, then an empty call.
const OBSERVED_SEQUENCE: readonly MockStep[] = [SEARCH, SEARCH, CITE, EMPTY];

describe("replyToChat after the observed empty final call", () => {
  test("asks once more and saves the answer, after the citations", async () => {
    const model = claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));

    const body = await finishReply(await reply());

    expect(model.doStreamCalls).toHaveLength(OBSERVED_SEQUENCE.length + 1);
    expect(streamedText(body)).toBe(ANSWER);
    expect(savedText()).toBe(ANSWER);
    const types = savedPartTypes();
    expect(types.lastIndexOf("text")).toBeGreaterThan(
      types.indexOf(`tool-${CITE_MANUAL_TOOL}`),
    );
    expect(savedReply()?.parts).toContainEqual(
      expect.objectContaining({
        type: `tool-${CITE_MANUAL_TOOL}`,
        output: {
          citations: [{ label: BEVEL_SECTION.label, url: BEVEL_SECTION.url }],
        },
      }),
    );
  });

  test("sends the answer-now call the same prompt and tools, plus the note", async () => {
    const model = claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));

    await finishReply(await reply());

    const lastCall = model.doStreamCalls.at(-1);
    const [firstCall] = model.doStreamCalls;
    expect(lastCall?.tools).toEqual(firstCall?.tools);
    expect(lastCall?.providerOptions).toEqual(firstCall?.providerOptions);
    expect(lastCall?.prompt.slice(0, firstCall?.prompt.length)).toEqual(
      firstCall?.prompt,
    );
    const note = lastCall?.prompt.at(-1);
    expect(note?.role).toBe("user");
    expect(JSON.stringify(note?.content)).toContain(NOTE_WORD);
  });
});

describe("replyToChat saving an answer-now reply", () => {
  test("keeps the thinking blocks' signatures in the saved reply", async () => {
    claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));

    await finishReply(await reply());

    expect(savedReply()?.parts).toContainEqual(
      expect.objectContaining({
        type: "reasoning",
        text: "",
        providerMetadata: { anthropic: { signature: "signature-1" } },
      }),
    );
  });

  test("never shows or saves the hidden note", async () => {
    claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));

    const body = await finishReply(await reply());

    expect(body).not.toContain(NOTE_WORD);
    expect(JSON.stringify(savedReply())).not.toContain(NOTE_WORD);
    expect(saveMessage).toHaveBeenCalledTimes(1);
    expect(saveMessage).toHaveBeenCalledWith(CHAT_ID, NEW_MESSAGE);
  });

  test("logs every call of both, with the answer-now call marked", async () => {
    claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));

    await finishReply(await reply());

    expect(replyStepsLog).toHaveBeenCalledTimes(1);
    expect(loggedReply()).toMatchObject({
      answerNow: true,
      textChars: ANSWER.length,
      // The mock model counts one output token per call.
      tokens: { output: OBSERVED_SEQUENCE.length + 1 },
      steps: [
        { finish: "tool-calls" },
        { finish: "tool-calls" },
        {
          finish: "tool-calls",
          parts: [
            "custom:anthropic.message_start",
            "reasoning:empty",
            `tool-call:${CITE_MANUAL_TOOL}`,
            `tool-result:${CITE_MANUAL_TOOL}`,
          ],
        },
        {
          finish: "stop",
          parts: ["custom:anthropic.message_start", "reasoning:empty"],
        },
        { finish: "stop", parts: expect.arrayContaining(["text"]) },
      ],
    });
  });
});

describe("replyToChat at the step limit", () => {
  test("asks for the answer once the limit stops a reply that is still searching", async () => {
    const model = claudePlaying(
      scriptAnsweringNote(Array.from({ length: MAX_STEPS + 1 }, () => SEARCH)),
    );

    const body = await finishReply(await reply());

    expect(model.doStreamCalls).toHaveLength(STEP_LIMIT_CALLS);
    expect(streamedText(body)).toBe(ANSWER);
    expect(savedText()).toBe(ANSWER);
    expect(loggedReply()).toMatchObject({ answerNow: true });
  });
});

describe("replyToChat when the answer-now call fails", () => {
  test("sends the error's case and saves no reply", async () => {
    claudePlaying((userText: string): readonly MockStep[] => {
      if (userText === NEW_MESSAGE.parts[0]?.text) {
        return OBSERVED_SEQUENCE;
      }
      return [
        {
          text: "",
          error: { type: "overloaded_error", message: "Overloaded" },
        },
      ];
    });

    const body = await finishReply(await reply());

    expect(body).toContain('"errorText":"overloaded"');
    expect(saveReply).not.toHaveBeenCalled();
    expect(replyStepsLog).not.toHaveBeenCalled();
  });
});

describe("replyToChat with text", () => {
  test("makes no answer-now call when the reply already has text", async () => {
    const model = claudePlaying(
      scriptAnsweringNote([SEARCH, CITE, { text: ANSWER, toolCalls: [] }]),
    );

    await finishReply(await reply());

    const calls = 3;
    expect(model.doStreamCalls).toHaveLength(calls);
    expect(savedText()).toBe(ANSWER);
    expect(loggedReply()).toMatchObject({ answerNow: false });
  });
});

describe("replyToChat saved parts", () => {
  test("drops the provider's call-start parts and keeps other custom parts", async () => {
    const model = new MockLanguageModelV4({
      doStream: withClaudeParts(
        mockTutorModel(() => [{ text: ANSWER, toolCalls: [] }]),
        [{ type: "custom", kind: "anthropic.fallback" }],
      ).doStream,
    });
    tutorModel.mockReturnValue(model);

    await finishReply(await reply());

    const customKinds = (savedReply()?.parts ?? []).flatMap((part) => {
      if (part.type === "custom") {
        return [part.kind];
      }
      return [];
    });
    expect(customKinds).toEqual(["anthropic.fallback"]);
  });
});
