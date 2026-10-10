import { fireEvent, render, screen } from "@testing-library/react";
import {
  createUIMessageStreamResponse,
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatView } from "@/components/chat-view.tsx";
import { userMessageForCase } from "@/errors/app-error.ts";

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

// A reply made in two steps, with reasoning between its text parts.
const multiStepReply: UIMessage = {
  id: "m3",
  role: "assistant",
  parts: [
    { type: "step-start" },
    { type: "text", text: "Select the edges." },
    { type: "reasoning", text: "Then the shortcut." },
    { type: "step-start" },
    { type: "text", text: "Press Ctrl+B." },
  ],
};

// Testing Library collapses whitespace by default; the message text test
// checks line breaks.
function keepWhitespace(text: string): string {
  return text;
}

function replyResponse(text: string): Response {
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

function failedReplyResponse(errorText: string): Response {
  return createUIMessageStreamResponse({
    stream: simulateReadableStream<UIMessageChunk>({
      chunks: [
        { type: "start", messageId: "m4" },
        { type: "error", errorText },
      ],
    }),
  });
}

function sendMessage(respond: () => Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => Promise.resolve(respond())),
  );
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ChatView conversation", () => {
  test("shows the saved conversation without the tutor's reasoning", () => {
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

  test("sends only the new message with the chat id and streams the reply", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(replyResponse("Press Ctrl+B.")),
    );
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
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/chat");
    const body: unknown = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      id: "chat-1",
      message: {
        role: "user",
        parts: [{ type: "text", text: "How do I bevel?" }],
      },
    });
    expect(body).not.toHaveProperty("messages");
  });
});

describe("ChatView message text", () => {
  test("shows a reply's text parts in order, each on its own line", () => {
    render(
      <ChatView
        chatId="chat-1"
        personaName="Mr. T"
        initialMessages={[multiStepReply]}
      />,
    );

    expect(
      screen.getByText("Select the edges.\nPress Ctrl+B.", {
        normalizer: keepWhitespace,
      }),
    ).toBeInTheDocument();
  });
});

describe("ChatView errors", () => {
  test("shows the message for the error case the stream reports", async () => {
    sendMessage(() => failedReplyResponse("out-of-credits"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessageForCase("out-of-credits"),
    );
  });

  test("shows the message for the error case in a failed response", async () => {
    sendMessage(() => new Response("database-unreachable", { status: 500 }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessageForCase("database-unreachable"),
    );
  });

  test("shows the unknown message instead of any other error text", async () => {
    sendMessage(
      () =>
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(userMessageForCase("unknown"));
    expect(alert).not.toHaveTextContent("Unauthorized");
  });
});
