// How replyToChat answers a message the chat already holds, which the
// browser may send again: the model sees an unanswered one once, as the
// conversation's last message, and an answered one gets no reply.
// conversation-to-answer.test.ts tests each case of a resend.
import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { HTTP_STATUS } from "@/http-status.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CHAT_ID,
  finishReply,
  listMessages,
  NEW_MESSAGE,
  OWNER,
  REPLY,
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

beforeEach(() => {
  resetReplyTestKit();
});

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
