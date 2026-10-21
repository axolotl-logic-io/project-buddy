// How replyToChat makes sure a reply ends with text the user can see. On
// Claude Sonnet 5.5 a reply can end without any: its text before a tool call
// may arrive as an empty thinking block, and it may end with an empty model
// call (Stage 2 smoke test, step 4) or run out of model calls mid-search.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { ANSWER_NOW_NOTE } from "@/tutor/answer-now.ts";
import type { MockConversation, MockStep } from "@/tutor/mock-script.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
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
} from "./answer-now-test-kit.ts";
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
} from "./reply-test-kit.ts";
import { streamedText } from "./stream-body-test-kit.ts";

vi.mock("@/chats/store.ts", () => import("./reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("./reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("./reply-test-kit.ts"));
vi.mock("next/server", () => import("./reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("./reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("../accounts/users-store-test-kit.ts"),
);
vi.mock("@/tutor/chat-naming.ts", () => import("./reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("./reply-test-kit.ts"));

// The reply's model-call limit, and the one answer-now call after it.

// A word of the hidden note that no reply in these tests uses.
const NOTE_TEXT: string = ANSWER_NOW_NOTE;

// A short remark before a tool call, which Claude sends as text.
const REPLY_LOG = z.object({
  steps: z.array(z.looseObject({ finish: z.string() })),
});
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
    expect(note?.content).toEqual([{ type: "text", text: NOTE_TEXT }]);
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

    expect(streamedText(body)).not.toContain(NOTE_TEXT);
    expect(savedText()).not.toContain(NOTE_TEXT);
    expect(saveMessage).toHaveBeenCalledTimes(1);
    expect(saveMessage).toHaveBeenCalledWith(OWNER, CHAT_ID, NEW_MESSAGE);
  });

  test("logs every call of both, with the answer-now call marked", async () => {
    claudePlaying(scriptAnsweringNote(OBSERVED_SEQUENCE));
    await finishReply(await reply());
    expect(replyStepsLog).toHaveBeenCalledOnce();
    const logged = loggedReply();
    expect(logged).toMatchObject({ answerNow: true, textChars: ANSWER.length });
    const { steps } = REPLY_LOG.parse(logged);
    expect(steps).toHaveLength(OBSERVED_SEQUENCE.length + 1);
    expect(steps.at(-1)).toMatchObject({ finish: "stop" });
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
