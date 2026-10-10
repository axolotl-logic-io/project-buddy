import { simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { getPersona, renderPersonaPrompt } from "@/personas";

const store = vi.hoisted(() => ({
  getChat: vi.fn(),
  listMessages: vi.fn(),
  saveMessage: vi.fn(),
}));
vi.mock("@/chats/store", () => store);

const model = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/tutor/model", () => ({ tutorModel: () => model.current }));

function replyingModel(text: string) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: text },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            logprobs: undefined,
            usage: {
              inputTokens: {
                total: 3,
                noCache: 3,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: { total: 5, text: 5, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

function chatRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const earlierMessages: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [{ type: "text", text: "Hello, fool." }],
  },
];

const newMessage: UIMessage = {
  id: "m3",
  role: "user",
  parts: [{ type: "text", text: "How do I bevel an edge?" }],
};

describe("POST /api/chat", () => {
  let mockModel: MockLanguageModelV4;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModel = replyingModel("Press Ctrl+B.");
    model.current = mockModel;
    store.getChat.mockResolvedValue({
      id: "chat-1",
      projectId: "project-1",
      projectName: "Low-poly fox",
      personaId: "mr-t",
      createdAt: new Date(),
    });
    store.listMessages.mockResolvedValue(earlierMessages);
  });

  it("returns 404 for an unknown chat", async () => {
    store.getChat.mockResolvedValue(undefined);

    const response = await POST(
      chatRequest({ id: "missing", message: newMessage }),
    );

    expect(response.status).toBe(404);
    expect(store.saveMessage).not.toHaveBeenCalled();
  });

  it("streams the tutor's reply", async () => {
    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Press Ctrl+B.");
  });

  it("sends the persona prompt as the system prompt with the full history", async () => {
    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );
    await response.text();

    const mrT = getPersona("mr-t");
    if (!mrT) throw new Error("mr-t persona missing");
    const [call] = mockModel.doStreamCalls;
    const [system, ...conversation] = call.prompt;
    expect(system.role).toBe("system");
    expect(system.content).toContain(renderPersonaPrompt(mrT));
    expect(system.content).toContain("Low-poly fox");
    expect(conversation.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(store.listMessages).toHaveBeenCalledWith("chat-1");
  });

  it("saves the new user message and the tutor's reply", async () => {
    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );
    await response.text();

    await vi.waitFor(() => expect(store.saveMessage).toHaveBeenCalledTimes(2));
    expect(store.saveMessage).toHaveBeenNthCalledWith(1, "chat-1", newMessage);
    const [chatId, reply] = store.saveMessage.mock.calls[1];
    expect(chatId).toBe("chat-1");
    expect(reply.role).toBe("assistant");
    expect(reply.id).toEqual(expect.any(String));
    expect(reply.id).not.toBe(newMessage.id);
    expect(reply.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: "Press Ctrl+B." }),
    );
  });
});
