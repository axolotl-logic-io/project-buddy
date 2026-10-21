// How replyToChat's diagnostics line marks a reply whose model calls the step
// limit stopped, and whether any call cited the manual. A reply that runs out
// of calls before cite_manual gets an answer with no citations (design-tidy
// smoke test, reply 3), and a log search finds it by these two fields.
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MockStep } from "@/tutor/mock-script.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import {
  ANSWER,
  CITE,
  claudePlaying,
  loggedReply,
  reply,
  SEARCH,
  savedText,
  scriptAnsweringNote,
} from "./answer-now-test-kit.ts";
import { finishReply, resetReplyTestKit } from "./reply-test-kit.ts";
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

// The reply's model-call limit.
const MAX_STEPS = 8;

const ANSWER_STEP: MockStep = { text: ANSWER, toolCalls: [] };

// The error log, silenced for the whole file; resetReplyTestKit clears it.
spyOnErrorLog();

beforeEach(() => {
  resetReplyTestKit();
});

describe("a reply's diagnostics line at the step limit", () => {
  test("marks a reply that ran out of model calls with searches only", async () => {
    const model = claudePlaying(
      scriptAnsweringNote(Array.from({ length: MAX_STEPS + 1 }, () => SEARCH)),
    );
    const body = await finishReply(await reply());
    expect(model.doStreamCalls).toHaveLength(MAX_STEPS + 1);
    expect(streamedText(body)).toBe(ANSWER);
    expect(savedText()).toBe(ANSWER);

    expect(loggedReply()).toMatchObject({
      answerNow: true,
      stoppedAtStepLimit: true,
      calledCiteManual: false,
    });
  });

  test("doesn't mark a cited reply that ends by itself", async () => {
    const sequence = [SEARCH, CITE, ANSWER_STEP];
    const model = claudePlaying(scriptAnsweringNote(sequence));
    await finishReply(await reply());
    expect(model.doStreamCalls).toHaveLength(sequence.length);
    expect(savedText()).toBe(ANSWER);

    expect(loggedReply()).toMatchObject({
      answerNow: false,
      stoppedAtStepLimit: false,
      calledCiteManual: true,
    });
  });

  test("doesn't mark a reply whose last allowed call answers", async () => {
    claudePlaying(
      scriptAnsweringNote([
        ...Array.from({ length: MAX_STEPS - 1 }, () => SEARCH),
        ANSWER_STEP,
      ]),
    );

    await finishReply(await reply());

    expect(loggedReply()).toMatchObject({
      answerNow: false,
      stoppedAtStepLimit: false,
      calledCiteManual: false,
    });
  });
});

describe("a reply's diagnostics line when a call cited the manual", () => {
  test("shows that a call cited the manual, though the limit stopped the reply", async () => {
    claudePlaying(
      scriptAnsweringNote([
        SEARCH,
        CITE,
        ...Array.from({ length: MAX_STEPS - 1 }, () => SEARCH),
      ]),
    );

    await finishReply(await reply());

    expect(loggedReply()).toMatchObject({
      answerNow: true,
      stoppedAtStepLimit: true,
      calledCiteManual: true,
    });
  });
});
