import { fireEvent, render, screen } from "@testing-library/react";
import {
  createUIMessageStreamResponse,
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatView } from "@/components/chat-view.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { chatIdFixture } from "@/id-fixtures.ts";
import { COPY } from "@/ui/copy.ts";

const savedMessages: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [
      { type: "reasoning", text: "Greet them." },
      { type: "text", text: "Hello there." },
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

// A reply that calls a tool between two pieces of text.
const toolReply: UIMessage = {
  id: "m6",
  role: "assistant",
  parts: [
    { type: "text", text: "Let me look that up." },
    {
      type: "dynamic-tool",
      toolName: "fake_unregistered_tool",
      toolCallId: "call-1",
      state: "output-available",
      input: { query: "bevel" },
      output: "Bevel tool page",
    },
    { type: "text", text: "Use the Bevel tool." },
  ],
};

// A saved reply written in Markdown.
const markdownReply: UIMessage = {
  id: "m5",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "- Select the edges.\n- Press **Ctrl+B**.\n\n```python\nimport bpy\n```",
    },
  ],
};

function renderChat(initialMessages: UIMessage[]): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={initialMessages}
      personaName="Mr. Tee"
    />,
  );
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
      chatId={chatIdFixture()}
      personaName="Mr. Tee"
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
        chatId={chatIdFixture()}
        personaName="Mr. Tee"
        initialMessages={savedMessages}
      />,
    );

    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("Hello there.")).toBeInTheDocument();
    expect(screen.getByText("Mr. Tee")).toBeInTheDocument();
    expect(screen.queryByText("Greet them.")).not.toBeInTheDocument();
  });

  test("sends only the new message with the chat id and streams the reply", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(replyResponse("Press Ctrl+B.")),
    );
    vi.stubGlobal("fetch", fetchMock);
    const chatId = chatIdFixture();
    render(
      <ChatView
        chatId={chatId}
        personaName="Mr. Tee"
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
      id: chatId,
      message: {
        role: "user",
        parts: [{ type: "text", text: "How do I bevel?" }],
      },
    });
    expect(body).not.toHaveProperty("messages");
  });
});

describe("ChatView message text", () => {
  test("shows each text part of a reply in order, without its reasoning", () => {
    renderChat([multiStepReply]);

    const first = screen.getByText("Select the edges.");
    const second = screen.getByText("Press Ctrl+B.");
    expect(first.compareDocumentPosition(second)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByText("Then the shortcut.")).not.toBeInTheDocument();
  });

  test("keeps text after a tool call after it", () => {
    renderChat([toolReply]);

    const before = screen.getByText("Let me look that up.");
    const after = screen.getByText("Use the Bevel tool.");
    expect(before.compareDocumentPosition(after)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByText("Bevel tool page")).not.toBeInTheDocument();
  });

  test("renders a reply's Markdown lists, emphasis and code blocks", async () => {
    renderChat([markdownReply]);

    const item = screen.getByText("Select the edges.").closest("li");
    expect(item?.parentElement?.tagName).toBe("UL");
    expect(screen.getByText("Ctrl+B").closest("li")).toHaveTextContent(
      "Press Ctrl+B.",
    );
    expect(document.body).not.toHaveTextContent("**");
    expect(
      await screen.findByText("import bpy", { exact: false }),
    ).toBeInTheDocument();
  });
});

describe("ChatView errors", () => {
  test("shows the message for the error case the stream reports", async () => {
    sendMessage(() => failedReplyResponse("out-of-credits"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessage("out-of-credits"),
    );
  });

  test("shows the message for the error case in a failed response", async () => {
    sendMessage(
      () =>
        new Response("database-unreachable", {
          status: HTTP_STATUS.internalServerError,
        }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessage("database-unreachable"),
    );
  });

  test("shows the unknown message instead of any other error text", async () => {
    sendMessage(
      () =>
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: HTTP_STATUS.unauthorized,
        }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(userMessage("unknown"));
    expect(alert).not.toHaveTextContent("Unauthorized");
  });

  test("says she was signed out, with a sign-in link, when the proxy refuses", async () => {
    sendMessage(
      () => new Response("signed-out", { status: HTTP_STATUS.unauthorized }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessage("signed-out"),
    );
    expect(
      screen.getByRole("link", { name: COPY.problems.signInLink }),
    ).toHaveAttribute("href", "/login");
  });
});
