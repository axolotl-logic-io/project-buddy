// How replyToChat answers a message the chat already holds, which the
// browser may send again: the model sees an unanswered one once, as the
// conversation's last message, and an answered one gets no reply.
// conversation-to-answer.test.ts tests each case of a resend. A resend while
// the first reply still streams gets no second reply, and one after a failed
// reply is answered at once: the reply's claim on its message is released
// when it fails.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
} from "@ai-sdk/provider";
import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MessageSaveResult } from "@/chats/store.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CHAT_ID,
  claimReply,
  finishReply,
  listMessages,
  NEW_MESSAGE,
  OWNER,
  REPLY,
  readMemory,
  releaseReply,
  resetReplyTestKit,
  saveMessage,
  saveReply,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("@/tutor/reply-test-kit.ts"));

const EARLIER: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [{ type: "text", text: "Hello, fool." }],
  },
];

const EARLIER_REPLY_TEXT = "Select the edge first, fool.";

// The resent message's text, as a model message's content holds it.
const RESENT_TEXT = JSON.stringify(NEW_MESSAGE.parts[0]?.text);

// The tutor model, replying REPLY and recording every call.
function recordingTutor(): MockLanguageModelV4 {
  const recorder = new MockLanguageModelV4({
    doStream: mockTutorModel(() => [{ text: REPLY, toolCalls: [] }]).doStream,
  });
  tutorModel.mockReturnValue(recorder);
  return recorder;
}

// The conversation the model's first call received, without the system
// prompt, as each message's role and content.
function firstCallConversation(
  recorder: MockLanguageModelV4,
): { role: string; content: string }[] {
  return (recorder.doStreamCalls[0]?.prompt ?? [])
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: JSON.stringify(message.content),
    }));
}

function reply(): Promise<Response> {
  return replyToChat(OWNER, { chatId: CHAT_ID, message: NEW_MESSAGE });
}

const log = spyOnErrorLog();

beforeEach(() => {
  resetReplyTestKit();
});

// The chat store's messages and claim on NEW_MESSAGE's reply, as the
// database keeps them: saving the message claims its reply, a claim fails
// while another holds, and releasing it lets the next claim succeed.
function heldInStore(): void {
  let claimed = false;
  listMessages.mockResolvedValue(EARLIER);
  saveMessage.mockImplementation((): Promise<MessageSaveResult> => {
    listMessages.mockResolvedValue([...EARLIER, NEW_MESSAGE]);
    claimed = true;
    return Promise.resolve("inserted");
  });
  claimReply.mockImplementation((): Promise<boolean> => {
    const claims = !claimed;
    claimed = true;
    return Promise.resolve(claims);
  });
  releaseReply.mockImplementation((): Promise<void> => {
    claimed = false;
    return Promise.resolve();
  });
}

// The tutor model, failing its first call and replying REPLY after that.
function failingOnceTutor(): MockLanguageModelV4 {
  const replying = mockTutorModel(() => [{ text: REPLY, toolCalls: [] }]);
  const recorder = new MockLanguageModelV4({
    doStream: (
      options: LanguageModelV4CallOptions,
    ): ReturnType<LanguageModelV4["doStream"]> => {
      if (recorder.doStreamCalls.length === 1) {
        return Promise.reject(new Error("Overloaded"));
      }
      return replying.doStream(options);
    },
  });
  tutorModel.mockReturnValue(recorder);
  return recorder;
}

describe("replyToChat resending a saved message", () => {
  test("gives the model the message once when it is the last saved one, saving it no second time", async () => {
    listMessages.mockResolvedValue([...EARLIER, NEW_MESSAGE]);
    const recorder = recordingTutor();

    await finishReply(await reply());

    const conversation = firstCallConversation(recorder);
    expect(conversation.map(({ role }) => role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(conversation.at(-1)?.content).toContain(RESENT_TEXT);
    expect(saveMessage).not.toHaveBeenCalled();
  });

  test("hands the browser a refusal as it is, asking the model nothing", async () => {
    listMessages.mockResolvedValue([
      ...EARLIER,
      NEW_MESSAGE,
      {
        id: "m4",
        role: "assistant",
        parts: [{ type: "text", text: EARLIER_REPLY_TEXT }],
      },
    ]);
    const recorder = recordingTutor();

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.conflict);
    expect(await response.text()).toBe("already-answered");
    expect(recorder.doStreamCalls).toHaveLength(0);
    expect(saveReply).not.toHaveBeenCalled();
  });
});

describe("replyToChat resending a message while its reply streams", () => {
  test("refuses with 409 a resend while the first reply still streams, asking the model once", async () => {
    heldInStore();
    const recorder = recordingTutor();

    const first = await reply();
    const again = await reply();

    expect(again.status).toBe(HTTP_STATUS.conflict);
    expect(await again.text()).toBe("already-answered");
    expect(await finishReply(first)).toContain("text-delta");
    expect(recorder.doStreamCalls).toHaveLength(1);
    expect(saveReply).toHaveBeenCalledTimes(1);
  });

  test("releases the claim when the reply fails, so a resend is answered", async () => {
    heldInStore();
    const recorder = failingOnceTutor();

    await finishReply(await reply());
    expect(releaseReply).toHaveBeenCalledExactlyOnceWith(
      OWNER,
      CHAT_ID,
      NEW_MESSAGE.id,
    );
    expect(saveReply).not.toHaveBeenCalled();

    const again = await reply();
    await finishReply(again);

    expect(again.status).toBe(HTTP_STATUS.ok);
    expect(recorder.doStreamCalls).toHaveLength(2);
    expect(saveReply).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalled();
  });
});

describe("replyToChat releasing its claim on the message", () => {
  test("releases the claim when the reply fails before it streams", async () => {
    readMemory.mockRejectedValue(new Error("Unexpected"));

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.internalServerError);
    expect(releaseReply).toHaveBeenCalledExactlyOnceWith(
      OWNER,
      CHAT_ID,
      NEW_MESSAGE.id,
    );
  });

  test("releases the claim when the reply isn't saved", async () => {
    saveReply.mockRejectedValueOnce(new Error("Unexpected"));

    await finishReply(await reply());

    expect(releaseReply).toHaveBeenCalledExactlyOnceWith(
      OWNER,
      CHAT_ID,
      NEW_MESSAGE.id,
    );
  });

  test("keeps the claim of a saved reply, which answers the message", async () => {
    await finishReply(await reply());

    expect(saveReply).toHaveBeenCalledTimes(1);
    expect(releaseReply).not.toHaveBeenCalled();
  });

  test("logs a failed release once and still answers the failure", async () => {
    readMemory.mockRejectedValue(new Error("Unexpected"));
    releaseReply.mockRejectedValue(new Error("Unreachable"));

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.internalServerError);
    expect(log.mock.calls.map(([heading]) => heading)).toEqual([
      "[app-error] unknown in reply to chat",
      "[app-error] unknown in release reply claim",
    ]);
  });
});
