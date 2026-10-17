import { createAnthropic } from "@ai-sdk/anthropic";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type BuddyId, getBuddy, renderBuddyPrompt } from "@/buddies/index.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { withClaudeParts } from "@/tutor/claude-parts-test-kit.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CHAT_ID,
  EARLIER_MESSAGES,
  finishReply,
  finishSaving,
  GRANT,
  getChat,
  listMessages,
  NEW_MESSAGE,
  nameChatIfDue,
  OWNER,
  PROJECT_ID,
  REPLY,
  resetReplyTestKit,
  savedReply,
  saveMessage,
  saveReply,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";
import { streamChunks, streamedText } from "@/tutor/stream-body-test-kit.ts";

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

function reply(): Promise<Response> {
  return replyToChat(OWNER, { chatId: CHAT_ID, message: NEW_MESSAGE });
}

function buddyPrompt(buddyId: BuddyId): string {
  return renderBuddyPrompt(getBuddy(buddyId));
}

// Claude's model with Anthropic's HTTP API stubbed out: it records each
// request body and answers 401.
function recordingClaude(): {
  model: ReturnType<ReturnType<typeof createAnthropic>>;
  bodies: unknown[];
} {
  const bodies: unknown[] = [];
  const anthropic = createAnthropic({
    apiKey: "sk-ant-test",
    fetch: (_url: unknown, init?: RequestInit): Promise<Response> => {
      bodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(
        new Response("{}", { status: HTTP_STATUS.unauthorized }),
      );
    },
  });
  return { model: anthropic("claude-sonnet-5-5"), bodies };
}

beforeEach(() => {
  resetReplyTestKit();
});

describe("replyToChat replies", () => {
  test("answers 404 with the not-found case for an unknown chat", async () => {
    getChat.mockResolvedValue(undefined);

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.notFound);
    expect(await response.text()).toBe("not-found");
    expect(saveMessage).not.toHaveBeenCalled();
  });

  test("streams the tutor's reply", async () => {
    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(streamedText(await finishReply(response))).toBe(REPLY);
  });

  test("loads the history and saves through the loaded chat's id", async () => {
    await finishReply(await reply());

    expect(getChat).toHaveBeenCalledWith(OWNER, CHAT_ID);
    expect(listMessages).toHaveBeenCalledWith(OWNER, CHAT_ID);
    expect(saveMessage.mock.calls.map(([owner, id]) => [owner, id])).toEqual([
      [OWNER, CHAT_ID],
    ]);
    expect(saveReply.mock.calls.map(([owner, id]) => [owner, id])).toEqual([
      [OWNER, CHAT_ID],
    ]);
  });
});

describe("replyToChat prompt", () => {
  test("sends the system prompt, then the full history", async () => {
    const recorder = new MockLanguageModelV4({
      doStream: mockTutorModel().doStream,
    });
    tutorModel.mockReturnValue(recorder);

    await finishReply(await reply());

    const [shared, chat, ...conversation] =
      recorder.doStreamCalls[0]?.prompt ?? [];
    expect(shared?.role).toBe("system");
    expect(shared?.content).toContain("Blender tutor");
    expect(chat?.role).toBe("system");
    expect(chat?.content).toContain(buddyPrompt("mr-tee"));
    expect(chat?.content).toContain("Low-poly fox");
    expect(conversation.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
  });

  test("asks Anthropic to cache the shared prompt and the conversation", async () => {
    const claude = recordingClaude();
    tutorModel.mockReturnValue(claude.model);

    await finishReply(await reply());

    const [body] = claude.bodies;
    const ephemeral = { type: "ephemeral" };
    expect(body).toHaveProperty(["cache_control"], ephemeral);
    expect(body).toHaveProperty(["system", 0, "cache_control"], ephemeral);
    expect(body).not.toHaveProperty(["system", 1, "cache_control"]);
  });
});

describe("replyToChat saving", () => {
  test("saves the new user message and the tutor's reply to it", async () => {
    await finishReply(await reply());

    expect(saveMessage).toHaveBeenCalledTimes(1);
    expect(saveMessage).toHaveBeenCalledWith(OWNER, CHAT_ID, NEW_MESSAGE);
    expect(saveReply).toHaveBeenCalledTimes(1);
    expect(saveReply).toHaveBeenCalledWith(
      OWNER,
      CHAT_ID,
      expect.anything(),
      NEW_MESSAGE.id,
    );
    const saved = savedReply();
    expect(saved?.role).toBe("assistant");
    expect(saved?.id).not.toBe(NEW_MESSAGE.id);
    expect(saved?.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: REPLY }),
    );
  });

  test("saves the whole reply when the browser disconnects", async () => {
    const response = await reply();

    await response.body?.cancel();
    await finishSaving();

    expect(savedReply()?.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: REPLY }),
    );
    expect(nameChatIfDue).toHaveBeenCalledExactlyOnceWith(GRANT, CHAT_ID, [
      ...EARLIER_MESSAGES,
      NEW_MESSAGE,
      savedReply(),
    ]);
  });

  test("saves the reply under the id the browser received", async () => {
    const body = await finishReply(await reply());

    const start = streamChunks(body).find((chunk) => chunk.type === "start");
    expect(start).toHaveProperty("messageId", savedReply()?.id);
  });
});

describe("replyToChat naming the chat", () => {
  test("names the chat once the reply is saved, for the message it answers", async () => {
    await finishReply(await reply());

    expect(nameChatIfDue).toHaveBeenCalledExactlyOnceWith(GRANT, CHAT_ID, [
      ...EARLIER_MESSAGES,
      NEW_MESSAGE,
      savedReply(),
    ]);
    expect(saveReply.mock.invocationCallOrder[0]).toBeLessThan(
      nameChatIfDue.mock.invocationCallOrder[0] ?? 0,
    );
  });

  test("ends the response once the reply is saved, while naming still runs", async () => {
    nameChatIfDue.mockReturnValue(
      new Promise<never>(() => {
        // Naming never finishes, as during a Haiku outage.
      }),
    );

    const body = await (await reply()).text();

    expect(streamedText(body)).toBe(REPLY);
    expect(saveReply).toHaveBeenCalledTimes(1);
    expect(nameChatIfDue).toHaveBeenCalledTimes(1);
  });
});

describe("replyToChat tools", () => {
  test("runs the tools the model calls and saves their parts", async () => {
    tutorModel.mockReturnValue(
      mockTutorModel(() => [
        { text: "", toolCalls: [{ toolName: "echo", input: { word: "b" } }] },
        { text: REPLY, toolCalls: [] },
      ]),
    );

    const body = await finishReply(await reply());

    expect(streamedText(body)).toBe(REPLY);
    expect(savedReply()?.parts).toContainEqual(
      expect.objectContaining({
        type: "tool-echo",
        state: "output-available",
        output: "echo: b",
      }),
    );
  });

  test("gives a tool that declares a context the loaded chat and its project", async () => {
    tutorModel.mockReturnValue(
      mockTutorModel(() => [
        { text: "", toolCalls: [{ toolName: "read_context", input: {} }] },
        { text: REPLY, toolCalls: [] },
      ]),
    );

    await finishReply(await reply());

    expect(savedReply()?.parts).toContainEqual(
      expect.objectContaining({
        type: "tool-read_context",
        state: "output-available",
        output: { owner: OWNER, chatId: CHAT_ID, projectId: PROJECT_ID },
      }),
    );
  });
});

describe("replyToChat saved parts", () => {
  test("drops the provider's call-start parts and keeps other custom parts", async () => {
    const model = new MockLanguageModelV4({
      doStream: withClaudeParts(
        mockTutorModel(() => [{ text: REPLY, toolCalls: [] }]),
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
