// How replyToChat makes sure a reply ends with text the user can see. On
// Claude Sonnet 5.5 a reply can end without any: its text before a tool call
// may arrive as an empty thinking block, and it may end with an empty model
// call (Stage 2 smoke test, step 4) or run out of model calls mid-search.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import {
  ANSWER,
  CITE,
  claudePlaying,
  EMPTY,
  loggedReply,
  OBSERVED_SEQUENCE,
  reply,
  SEARCH,
  savedPartTypes,
  savedText,
  scriptAnsweringNote,
} from "@/tutor/answer-now-test-kit.ts";
import type { MockConversation, MockStep } from "@/tutor/mock-script.ts";
import {
  BEVEL_SECTION,
  CHAT_ID,
  finishReply,
  NEW_MESSAGE,
  OWNER,
  replyStepsLog,
  resetReplyTestKit,
  savedReply,
  saveMessage,
  saveReply,
} from "@/tutor/reply-test-kit.ts";
import { streamedText } from "@/tutor/stream-body-test-kit.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("@/accounts/users-store-test-kit.ts"),
);
vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("@/tutor/reply-test-kit.ts"));

// The reply's model-call limit, and the one answer-now call after it.
const MAX_STEPS = 8;
const STEP_LIMIT_CALLS: number = MAX_STEPS + 1;
// A word of the hidden note that no reply in these tests uses.
const NOTE_WORD = "note from the app";

// A short remark before a tool call, which Claude sends as text.
const REMARK = "Let me check the manual.";

// The error log, silenced for the whole file; resetReplyTestKit clears it.
spyOnErrorLog();

beforeEach(() => {
  resetReplyTestKit();
});

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
    expect(saveMessage).toHaveBeenCalledWith(OWNER, CHAT_ID, NEW_MESSAGE);
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

describe("replyToChat after a short remark and an empty final call", () => {
  test("asks once more and saves the remark, then the answer", async () => {
    const sequence: readonly MockStep[] = [
      { ...SEARCH, text: REMARK },
      CITE,
      EMPTY,
    ];
    const model = claudePlaying(scriptAnsweringNote(sequence));

    const body = await finishReply(await reply());

    expect(model.doStreamCalls).toHaveLength(sequence.length + 1);
    expect(streamedText(body)).toBe(`${REMARK}${ANSWER}`);
    expect(savedText()).toBe(`${REMARK}${ANSWER}`);
    expect(loggedReply()).toMatchObject({ answerNow: true });
  });
});

describe("replyToChat after an answer written as it cites, and an empty final call", () => {
  test("makes no answer-now call and saves the answer once", async () => {
    const sequence: readonly MockStep[] = [
      SEARCH,
      { ...CITE, text: ANSWER },
      EMPTY,
    ];
    const model = claudePlaying(scriptAnsweringNote(sequence));

    const body = await finishReply(await reply());

    expect(model.doStreamCalls).toHaveLength(sequence.length);
    expect(streamedText(body)).toBe(ANSWER);
    expect(savedText()).toBe(ANSWER);
    expect(loggedReply()).toMatchObject({ answerNow: false });
  });
});

describe("replyToChat when the answer-now call fails", () => {
  test("sends the error's case and saves no reply", async () => {
    claudePlaying(
      (
        _userText: string,
        { answerNow }: MockConversation,
      ): readonly MockStep[] => {
        if (!answerNow) {
          return OBSERVED_SEQUENCE;
        }
        return [
          {
            text: "",
            error: { type: "overloaded_error", message: "Overloaded" },
          },
        ];
      },
    );

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
