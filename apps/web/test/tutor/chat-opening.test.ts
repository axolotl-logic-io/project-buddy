import {
  type LanguageModelV4CallOptions,
  LoadAPIKeyError,
} from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getBuddy, renderBuddyPrompt } from "@/buddies/index.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  type ChatOpeningRequest,
  writeChatOpening,
} from "@/tutor/chat-opening.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { anthropicHttpError } from "../errors/error-fixtures.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { userIdFixture } from "../id-fixtures.ts";
import { quotaGrantFixture } from "../quota/quota-test-kit.ts";
import { resetReplyTestKit, tutorModel } from "./reply-test-kit.ts";

vi.mock("@/tutor/model.ts", () => import("./reply-test-kit.ts"));

const QUESTION = "What would you like to make, fool?";

// How long the opening waits for Claude.
const OPENING_TIMEOUT_MS = 30_000;

const SAVED_MEMORY = {
  text: "## Goals\n\n- A low-poly fox for a game",
  version: MEMORY_VERSION_NUMBER.parse(1),
};

const REQUEST: ChatOpeningRequest = {
  grant: quotaGrantFixture(userIdFixture()),
  projectName: "Low-poly fox",
  isInterviewChat: true,
  memory: SAVED_MEMORY,
  buddy: getBuddy("mr-tee"),
  userName: undefined,
};

function chatBuddyPrompt(): string {
  const buddy = getBuddy("mr-tee");
  return renderBuddyPrompt(buddy);
}

beforeEach(() => {
  resetReplyTestKit();
  tutorModel.mockReturnValue(
    mockTutorModel(() => [{ text: QUESTION, toolCalls: [] }]),
  );
});

// Makes the next model call fail as Claude does when the account is out of
// credits.
function outOfCredits(): void {
  tutorModel.mockReturnValue(
    new MockLanguageModelV4({
      doStream: (): ReturnType<MockLanguageModelV4["doStream"]> =>
        Promise.reject(
          anthropicHttpError(
            HTTP_STATUS.badRequest,
            "invalid_request_error",
            "Your credit balance is too low to access the Anthropic API.",
          ),
        ),
    }),
  );
}

describe("writeChatOpening asking Claude", () => {
  test("is the tutor's first message, as a message from the tutor", async () => {
    const opening = await writeChatOpening(REQUEST);

    expect(opening?.role).toBe("assistant");
    expect(opening?.id).not.toBe("");
    expect(opening?.parts).toEqual([{ type: "text", text: QUESTION }]);
  });

  test("asks the model once, with the chat's prompt and the kickoff alone", async () => {
    const recorder = new MockLanguageModelV4({
      doStream: mockTutorModel(() => [{ text: QUESTION, toolCalls: [] }])
        .doStream,
    });
    tutorModel.mockReturnValue(recorder);

    await writeChatOpening(REQUEST);

    expect(recorder.doStreamCalls).toHaveLength(1);
    const [shared, chat, ...conversation] =
      recorder.doStreamCalls[0]?.prompt ?? [];
    expect(shared?.content).toContain(REQUEST.buddy.parts.role);
    expect(shared?.content).not.toContain(INTERVIEW_PROMPT);
    expect(chat?.content).toContain(INTERVIEW_PROMPT);
    expect(chat?.content).toContain(REQUEST.projectName);
    expect(chat?.content).toContain(SAVED_MEMORY.text);
    expect(chat?.content).toContain(chatBuddyPrompt());
    expect(conversation.map((message) => message.role)).toEqual(["user"]);
  });

  test("leaves the interview out of the prompt of a chat that is not the interview chat", async () => {
    const recorder = new MockLanguageModelV4({
      doStream: mockTutorModel(() => [{ text: QUESTION, toolCalls: [] }])
        .doStream,
    });
    tutorModel.mockReturnValue(recorder);

    await writeChatOpening({ ...REQUEST, isInterviewChat: false });

    const prompt = recorder.doStreamCalls[0]?.prompt ?? [];
    expect(prompt.map(({ content }) => content).join("\n")).not.toContain(
      INTERVIEW_PROMPT,
    );
  });
});

describe("writeChatOpening with the owner's name", () => {
  test("puts her name for every {{name}} in the prompt, leaving the buddy as written", async () => {
    const recorder = new MockLanguageModelV4({
      doStream: mockTutorModel(() => [{ text: QUESTION, toolCalls: [] }])
        .doStream,
    });
    tutorModel.mockReturnValue(recorder);
    const mrTee = getBuddy("mr-tee");
    const buddy = {
      ...mrTee,
      parts: { ...mrTee.parts, role: "Teach {{name}}.", voice: "Hi {{name}}" },
    };

    await writeChatOpening({ ...REQUEST, buddy, userName: "Mabel" });

    const [shared, chat] = recorder.doStreamCalls[0]?.prompt ?? [];
    expect(shared?.content).toContain("Teach Mabel.");
    expect(chat?.content).toContain("Hi Mabel");
    expect(JSON.stringify([shared, chat])).not.toContain("{{name}}");
    expect(buddy.parts.voice).toBe("Hi {{name}}");
  });
});

describe("writeChatOpening without Claude", () => {
  test("is undefined when Claude fails, logged once", async () => {
    const errorLog = spyOnErrorLog();
    outOfCredits();

    expect(await writeChatOpening(REQUEST)).toBeUndefined();
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog.mock.calls[0]?.[0]).toBe(
      "[app-error] out-of-credits in chat opening",
    );
  });

  test("is undefined when Claude fails mid-stream, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockReturnValue(
      mockTutorModel(() => [
        {
          text: "What",
          error: { type: "overloaded_error", message: "Overloaded" },
        },
      ]),
    );

    expect(await writeChatOpening(REQUEST)).toBeUndefined();
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});

describe("writeChatOpening without Claude's text", () => {
  test("is undefined when the model can't be made, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockImplementation(() => {
      throw new LoadAPIKeyError({ message: "ANTHROPIC_API_KEY is not set." });
    });

    expect(await writeChatOpening(REQUEST)).toBeUndefined();
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  test("is undefined when Claude writes nothing, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockReturnValue(
      mockTutorModel(() => [{ text: " \n", toolCalls: [] }]),
    );

    expect(await writeChatOpening(REQUEST)).toBeUndefined();
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});

describe("writeChatOpening timing out", () => {
  test("waits 30 s for Claude, then is undefined, logged once", async () => {
    const errorLog = spyOnErrorLog();
    const timedOut = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timedOut.signal);
    tutorModel.mockReturnValue(
      new MockLanguageModelV4({
        doStream: ({
          abortSignal,
        }: LanguageModelV4CallOptions): ReturnType<
          MockLanguageModelV4["doStream"]
        > =>
          new Promise((_resolve, reject) => {
            abortSignal?.addEventListener("abort", () => {
              reject(abortSignal.reason);
            });
            timedOut.abort(new DOMException("Timed out", "TimeoutError"));
          }),
      }),
    );

    expect(await writeChatOpening(REQUEST)).toBeUndefined();
    expect(timeout).toHaveBeenCalledWith(OPENING_TIMEOUT_MS);
    expect(errorLog).toHaveBeenCalledTimes(1);
    timeout.mockRestore();
  });
});
