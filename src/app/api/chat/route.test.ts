import { APICallError, simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { AppError } from "@/errors/app-error";
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

// Anthropic's answer when the account has run out of credits.
function outOfCreditsModel() {
  return new MockLanguageModelV4({
    doStream: async () => {
      throw new APICallError({
        message:
          "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
        url: "https://api.anthropic.com/v1/messages",
        requestBodyValues: {},
        statusCode: 400,
        responseHeaders: { "request-id": "req_011CTest" },
        data: {
          type: "error",
          error: {
            type: "invalid_request_error",
            message: "Your credit balance is too low",
          },
        },
        isRetryable: false,
      });
    },
  });
}

// A reply that starts streaming, then gets Anthropic's overloaded error event.
function overloadedMidStreamModel() {
  return new MockLanguageModelV4({
    doStream: async () => ({
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
    }),
  });
}

// The error chunks of a UI message stream response.
function errorChunks(body: string) {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: {"))
    .map((line) => JSON.parse(line.slice("data: ".length)))
    .filter((chunk) => chunk.type === "error");
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
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("sends the case, not the upstream message, when the model call fails", async () => {
    model.current = outOfCreditsModel();

    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );
    const body = await response.text();

    expect(errorChunks(body)).toEqual([
      { type: "error", errorText: "out-of-credits" },
    ]);
    expect(body).not.toContain("credit balance");
  });

  it("logs a failed model call once with its case and the original error", async () => {
    model.current = outOfCreditsModel();

    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );
    await response.text();

    expect(console.error).toHaveBeenCalledTimes(1);
    const [prefix, details] = vi.mocked(console.error).mock.calls[0];
    expect(prefix).toBe("[app-error] out-of-credits in chat reply");
    expect(details).toContain("Your credit balance is too low");
    expect(details).toContain("req_011CTest");
  });

  it("keeps the user's message but saves no reply when the model call fails", async () => {
    model.current = outOfCreditsModel();

    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );
    await response.text();

    expect(store.saveMessage).toHaveBeenCalledTimes(1);
    expect(store.saveMessage).toHaveBeenCalledWith("chat-1", newMessage);
  });

  it("sends and logs the case of an error in the middle of the reply", async () => {
    model.current = overloadedMidStreamModel();

    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );
    const body = await response.text();

    expect(body).toContain("Press Ctrl");
    expect(errorChunks(body)).toEqual([
      { type: "error", errorText: "overloaded" },
    ]);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.error).mock.calls[0][0]).toBe(
      "[app-error] overloaded in chat reply",
    );
  });

  it("answers 500 with the case when a store call fails", async () => {
    store.listMessages.mockRejectedValue(
      new AppError("database-unreachable", new Error("fetch failed")),
    );

    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("database-unreachable");
    // The store logged it already.
    expect(console.error).not.toHaveBeenCalled();
  });

  it("answers 500 with the unknown case and logs any other failure", async () => {
    store.getChat.mockResolvedValue({
      id: "chat-1",
      projectId: "project-1",
      projectName: "Low-poly fox",
      personaId: "retired-persona",
      createdAt: new Date(),
    });

    const response = await POST(
      chatRequest({ id: "chat-1", message: newMessage }),
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("unknown");
    expect(vi.mocked(console.error).mock.calls[0][0]).toBe(
      "[app-error] unknown in POST /api/chat",
    );
  });
});
