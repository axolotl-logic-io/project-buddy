// How replyToChat answers a message the chat already holds, which the
// browser may send again. The store saves it once, and the model sees it
// once, as the conversation's last message.
import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CHAT_ID,
  finishReply,
  listMessages,
  NEW_MESSAGE,
  REPLY,
  resetReplyTestKit,
  savedReply,
  saveReply,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));

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
  return replyToChat({ chatId: CHAT_ID, message: NEW_MESSAGE });
}

beforeEach(() => {
  resetReplyTestKit();
});

describe("replyToChat resending a saved message", () => {
  test("gives the model the message once when it is the last saved one", async () => {
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
  });

  test("answers an answered message again from the history up to it", async () => {
    listMessages.mockResolvedValue([
      ...EARLIER,
      NEW_MESSAGE,
      {
        id: "m4",
        role: "assistant",
        parts: [{ type: "text", text: EARLIER_REPLY_TEXT }],
      },
      { id: "m5", role: "user", parts: [{ type: "text", text: "Thanks!" }] },
    ]);
    const recorder = recordingTutor();

    await finishReply(await reply());

    const conversation = firstCallConversation(recorder);
    expect(conversation).toHaveLength(EARLIER.length + 1);
    expect(conversation.at(-1)?.content).toContain(RESENT_TEXT);
    expect(saveReply).toHaveBeenCalledExactlyOnceWith(
      CHAT_ID,
      expect.anything(),
      NEW_MESSAGE.id,
    );
    const saved = savedReply();
    expect(saved?.id).not.toBe("m4");
    expect(saved?.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: REPLY }),
    );
    expect(JSON.stringify(saved)).not.toContain(EARLIER_REPLY_TEXT);
  });
});
