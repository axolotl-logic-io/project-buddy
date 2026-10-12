// The model call that names a chat: what it sends Haiku, and its limits.
import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import type {
  getChat,
  listMessages,
  saveAutomaticChatName,
} from "@/chats/store.ts";
import { messageIdFixture, userIdFixture } from "@/id-fixtures.ts";
import { nameChatIfDue } from "@/tutor/chat-naming.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type { chatNameModel } from "@/tutor/model.ts";

const store = vi.hoisted(() => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
  saveAutomaticChatName: vi.fn<typeof saveAutomaticChatName>(),
}));
vi.mock("@/chats/store.ts", () => store);

const OWNER = userIdFixture();

const model = vi.hoisted(() => ({
  chatNameModel: vi.fn<typeof chatNameModel>(),
}));
vi.mock("@/tutor/model.ts", () => model);

// How long the naming call may take, as chat-naming.ts sets it.
const NAMING_TIMEOUT_MS = 15_000;

const NAME = "Low-poly fox goals";
const OPENING_QUESTION = "What would you like to make?";
const HER_FIRST_MESSAGE = messageIdFixture("her-1");

// An interview chat after her first message: the tutor's opening question,
// her answer and the reply to it.
const INTERVIEW_CHAT: UIMessage[] = [
  {
    id: "opening",
    role: "assistant",
    parts: [{ type: "text", text: OPENING_QUESTION }],
  },
  {
    id: HER_FIRST_MESSAGE,
    role: "user",
    parts: [{ type: "text", text: "A low-poly fox." }],
  },
  {
    id: "reply-1",
    role: "assistant",
    parts: [{ type: "text", text: "Good. How well do you know Blender?" }],
  },
];

// The naming model, answering NAME and recording each call's options.
function recordingNamingModel(): MockLanguageModelV4 {
  const recorder = new MockLanguageModelV4({
    doGenerate: mockTutorModel(() => [{ text: NAME, toolCalls: [] }])
      .doGenerate,
  });
  model.chatNameModel.mockReturnValue(recorder);
  return recorder;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.getChat.mockResolvedValue(MR_TEE_CHAT);
  store.listMessages.mockResolvedValue(INTERVIEW_CHAT);
  store.saveAutomaticChatName.mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("chat naming's call to Haiku", () => {
  test("sends the chat from the tutor's question, for the model to start with the user, charged to the owner", async () => {
    const recorder = recordingNamingModel();

    await nameChatIfDue(OWNER, MR_TEE_CHAT.id, HER_FIRST_MESSAGE);

    const conversation = (recorder.doGenerateCalls[0]?.prompt ?? []).filter(
      ({ role }) => role !== "system",
    );
    expect(model.chatNameModel).toHaveBeenCalledExactlyOnceWith(OWNER);
    expect(conversation.map(({ role }) => role)).toEqual([
      "assistant",
      "user",
      "assistant",
      "user",
    ]);
    expect(JSON.stringify(conversation[0]?.content)).toContain(
      OPENING_QUESTION,
    );
    expect(store.saveAutomaticChatName).toHaveBeenCalledExactlyOnceWith(
      OWNER,
      MR_TEE_CHAT.id,
      NAME,
    );
  });

  test("has a time limit, so a slow answer can't hang", async () => {
    const recorder = recordingNamingModel();
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await nameChatIfDue(OWNER, MR_TEE_CHAT.id, HER_FIRST_MESSAGE);

    expect(timeout).toHaveBeenCalledExactlyOnceWith(NAMING_TIMEOUT_MS);
    expect(recorder.doGenerateCalls[0]?.abortSignal).toBeInstanceOf(
      AbortSignal,
    );
  });
});
