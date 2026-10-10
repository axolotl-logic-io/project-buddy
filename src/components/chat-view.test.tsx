import { fireEvent, render, screen } from "@testing-library/react";
import {
  createUIMessageStreamResponse,
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatView } from "@/components/chat-view";
import { userMessageForCase } from "@/errors/app-error";

const savedMessages: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [
      { type: "reasoning", text: "Greet them." },
      { type: "text", text: "Hello, fool." },
    ],
  },
];

function replyResponse(text: string) {
  return createUIMessageStreamResponse({
    stream: simulateReadableStream<UIMessageChunk>({
      chunks: [
        { type: "start", messageId: "m4" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: text },
        { type: "text-end", id: "t1" },
        { type: "finish" },
      ],
    }),
  });
}

function failedReplyResponse(errorText: string) {
  return createUIMessageStreamResponse({
    stream: simulateReadableStream<UIMessageChunk>({
      chunks: [
        { type: "start", messageId: "m4" },
        { type: "error", errorText },
      ],
    }),
  });
}

function sendMessage(fetchMock: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(fetchMock));
  render(
    <ChatView
      chatId="chat-1"
      personaName="Mr. T"
      initialMessages={savedMessages}
    />,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
    target: { value: "How do I bevel?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

describe("ChatView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the saved conversation without the tutor's reasoning", () => {
    render(
      <ChatView
        chatId="chat-1"
        personaName="Mr. T"
        initialMessages={savedMessages}
      />,
    );

    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("Hello, fool.")).toBeInTheDocument();
    expect(screen.getByText("Mr. T")).toBeInTheDocument();
    expect(screen.queryByText("Greet them.")).not.toBeInTheDocument();
  });

  it("sends only the new message with the chat id and streams the reply", async () => {
    const fetchMock = vi.fn(async () => replyResponse("Press Ctrl+B."));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ChatView
        chatId="chat-1"
        personaName="Mr. T"
        initialMessages={savedMessages}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "How do I bevel?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Press Ctrl+B.")).toBeInTheDocument();
    expect(screen.getByText("How do I bevel?")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/chat");
    const body = JSON.parse(String(init.body));
    expect(body.id).toBe("chat-1");
    expect(body.message).toMatchObject({
      role: "user",
      parts: [{ type: "text", text: "How do I bevel?" }],
    });
    expect(body.messages).toBeUndefined();
  });

  it("shows the message for the error case the stream reports", async () => {
    sendMessage(async () => failedReplyResponse("out-of-credits"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessageForCase("out-of-credits"),
    );
  });

  it("shows the message for the error case in a failed response", async () => {
    sendMessage(
      async () => new Response("database-unreachable", { status: 500 }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessageForCase("database-unreachable"),
    );
  });

  it("shows the unknown message instead of any other error text", async () => {
    sendMessage(
      async () =>
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(userMessageForCase("unknown"));
    expect(alert).not.toHaveTextContent("Unauthorized");
  });
});
