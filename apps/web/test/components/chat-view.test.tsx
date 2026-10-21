import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { chatIdFixture } from "../id-fixtures.ts";
import {
  answerChat,
  renderChat,
  replyChunks,
  replyResponse,
  sendMessage,
} from "./chat-view-test-kit.tsx";
import { refresh } from "./router-test-kit.ts";

const BUDDY_NAME: string = getBuddy("mr-tee").name;

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

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
function textResponse(text: string): Response {
  return replyResponse(replyChunks(text));
}
function failedReplyResponse(errorText: string): Response {
  return replyResponse([
    { type: "start", messageId: "m4" },
    { type: "error", errorText },
  ]);
}
function sendAnswered(respond: () => Response): void {
  answerChat(respond());
  renderChat(savedMessages);
  sendMessage();
}

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("ChatView conversation", () => {
  test("sends only the new message with the chat id and streams the reply", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(textResponse("Press Ctrl+B.")),
    );
    vi.stubGlobal("fetch", fetchMock);
    const chatId = chatIdFixture();
    render(
      <ChatView
        chatId={chatId}
        buddyName={BUDDY_NAME}
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
});

describe("ChatView errors", () => {
  test("shows the message for the error case the stream reports", async () => {
    sendAnswered(() => failedReplyResponse("out-of-credits"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessage("out-of-credits"),
    );
  });

  test("shows the message for the error case in a failed response", async () => {
    sendAnswered(
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
    sendAnswered(
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
    sendAnswered(
      () => new Response("signed-out", { status: HTTP_STATUS.unauthorized }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      userMessage("signed-out"),
    );
    expect(
      screen.getByRole("link", { name: PROBLEMS_COPY.signInLink }),
    ).toHaveAttribute("href", "/login");
  });
});

describe("ChatView answered already", () => {
  test("reloads the saved conversation when the message was answered already", async () => {
    sendAnswered(
      () => new Response("already-answered", { status: HTTP_STATUS.conflict }),
    );

    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  test("reloads nothing for any other failure", async () => {
    sendAnswered(() => failedReplyResponse("out-of-credits"));

    await screen.findByRole("alert");
    expect(refresh).not.toHaveBeenCalled();
  });
});
