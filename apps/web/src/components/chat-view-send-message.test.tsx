// "use_case_send_message" in use-cases/chats.md, as she sees it in the page:
// an empty message can't be sent, hers shows at once while the tutor thinks,
// and the reply follows under the buddy's name. That the exchange is saved
// is e2e/chats.spec.ts's.
import { fireEvent, render, screen } from "@testing-library/react";
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { chatIdFixture } from "@/id-fixtures.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("@/components/router-test-kit.ts"));

const BUDDY_NAME: string = getBuddy("mr-tee").name;
const MESSAGE = "Hello, tutor!";
const REPLY = "Hello, fool.";

function renderChat(): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[]}
      buddyName={BUDDY_NAME}
    />,
  );
}

function messageBox(): HTMLElement {
  return screen.getByRole("textbox", { name: CHAT_COPY.messageLabel });
}

function sendButton(): HTMLElement {
  return screen.getByRole("button", { name: CHAT_COPY.send });
}

// Has the chat's request for a reply wait on a stream the test writes, and
// resolves with that stream's controller once the chat has asked.
function holdReply(): Promise<ReadableStreamDefaultController<UIMessageChunk>> {
  const opened =
    Promise.withResolvers<ReadableStreamDefaultController<UIMessageChunk>>();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() =>
      Promise.resolve(
        createUIMessageStreamResponse({
          stream: new ReadableStream<UIMessageChunk>({ start: opened.resolve }),
        }),
      ),
    ),
  );
  return opened.promise;
}

// Writes the whole reply to the held stream and ends it.
function release(
  stream: ReadableStreamDefaultController<UIMessageChunk>,
): void {
  stream.enqueue({ type: "start", messageId: "r1" });
  stream.enqueue({ type: "text-start", id: "t1" });
  stream.enqueue({ type: "text-delta", id: "t1", delta: REPLY });
  stream.enqueue({ type: "text-end", id: "t1" });
  stream.enqueue({ type: "finish" });
  stream.close();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("use_case_send_message", () => {
  test("an empty message can't be sent", () => {
    renderChat();

    expect(sendButton()).toBeDisabled();
    fireEvent.change(messageBox(), { target: { value: "   " } });
    expect(sendButton()).toBeDisabled();
  });

  test("her message shows at once, the tutor thinks, then the reply follows under the buddy's name", async () => {
    const held = holdReply();
    renderChat();

    fireEvent.change(messageBox(), { target: { value: MESSAGE } });
    fireEvent.click(sendButton());

    expect(await screen.findByText(MESSAGE)).toBeVisible();
    expect(
      await screen.findByText(CHAT_COPY.thinking(BUDDY_NAME)),
    ).toBeVisible();
    fireEvent.change(messageBox(), { target: { value: "And another thing" } });
    expect(sendButton()).toBeDisabled();

    release(await held);

    const reply = (await screen.findByText(REPLY)).closest("li");
    expect(reply).toHaveTextContent(BUDDY_NAME);
    await vi.waitFor(() => {
      expect(
        screen.queryByText(CHAT_COPY.thinking(BUDDY_NAME)),
      ).not.toBeInTheDocument();
    });
  });
});
