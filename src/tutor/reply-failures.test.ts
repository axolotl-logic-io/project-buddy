import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AppError } from "@/errors/app-error.ts";
import { anthropicHttpError } from "@/errors/error-fixtures.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CHAT_ID,
  finishReply,
  getChat,
  listMessages,
  NEW_MESSAGE,
  resetReplyTestKit,
  saveMessage,
  streamChunks,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));

function reply(): Promise<Response> {
  return replyToChat({ chatId: CHAT_ID, message: NEW_MESSAGE });
}

function errorChunks(body: string): unknown[] {
  return streamChunks(body).filter((chunk) => chunk.type === "error");
}

// Anthropic's answer when the account has run out of credits.
function outOfCreditsModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doStream: (): ReturnType<MockLanguageModelV4["doStream"]> =>
      Promise.reject(
        anthropicHttpError(
          HTTP_STATUS.badRequest,
          "invalid_request_error",
          "Your credit balance is too low to access the Anthropic API.",
        ),
      ),
  });
}

// A reply that starts streaming, then gets Anthropic's overloaded error event.
function overloadedMidStreamModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doStream: {
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Press Ctrl" },
          {
            type: "error",
            error: { type: "overloaded_error", message: "Overloaded" },
          },
        ],
      }),
    },
  });
}

// The error log, silenced for the whole file; resetReplyTestKit clears it.
const log = spyOnErrorLog();

beforeEach(() => {
  resetReplyTestKit();
});

describe("replyToChat model failures", () => {
  test("keeps the user's message but saves no reply", async () => {
    tutorModel.mockReturnValue(outOfCreditsModel());

    await finishReply(await reply());

    expect(saveMessage).toHaveBeenCalledTimes(1);
    expect(saveMessage).toHaveBeenCalledWith(CHAT_ID, NEW_MESSAGE);
  });

  test("sends the case, not the upstream message", async () => {
    tutorModel.mockReturnValue(outOfCreditsModel());

    const body = await finishReply(await reply());

    expect(errorChunks(body)).toEqual([
      { type: "error", errorText: "out-of-credits" },
    ]);
    expect(body).not.toContain("credit balance");
  });

  test("logs the failure once with its case and the original error", async () => {
    tutorModel.mockReturnValue(outOfCreditsModel());

    await finishReply(await reply());

    expect(log).toHaveBeenCalledTimes(1);
    const [prefix, details] = log.mock.calls[0] ?? [];
    expect(prefix).toBe("[app-error] out-of-credits in chat reply");
    expect(details).toContain("Your credit balance is too low");
  });

  test("sends and logs the case of an error in the middle of the reply", async () => {
    tutorModel.mockReturnValue(overloadedMidStreamModel());

    const body = await finishReply(await reply());

    expect(body).toContain("Press Ctrl");
    expect(errorChunks(body)).toEqual([
      { type: "error", errorText: "overloaded" },
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toBe("[app-error] overloaded in chat reply");
  });
});

describe("replyToChat other failures", () => {
  test("answers 500 with the case when a store call fails", async () => {
    listMessages.mockRejectedValue(
      new AppError("database-unreachable", new Error("fetch failed")),
    );

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.internalServerError);
    expect(await response.text()).toBe("database-unreachable");
    // The store logged it already.
    expect(log).not.toHaveBeenCalled();
  });

  test("answers 500 with the unknown case and logs any other failure", async () => {
    getChat.mockRejectedValue(new Error("Unexpected"));

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.internalServerError);
    expect(await response.text()).toBe("unknown");
    expect(log.mock.calls[0]?.[0]).toBe("[app-error] unknown in reply to chat");
  });

  test("logs a failed save of the reply once", async () => {
    saveMessage
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("Unexpected"));

    await finishReply(await reply());

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toBe(
      "[app-error] unknown in save chat reply",
    );
  });
});
