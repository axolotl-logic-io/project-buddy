// "use_case_reply_fails" in use-cases/when-things-go-wrong.md, in Chromium
// and WebKit, for a chat she reopens after its reply failed: her message,
// the last, has no reply, and the chat says so, with Retry reply, which asks
// for the reply again; and a chat whose last message has its reply says
// nothing of the kind.
import type { UIMessage, UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { chatIdFixture, userIdFixture } from "../../../support/id-fixtures.ts";
import { answerChat, holdBeforeChunk } from "../chat-stream-test-kit.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const BUDDY_NAME: string = getBuddy("mr-tee").name;
const QUESTION = "How do I bevel an edge?";
const REPLY = "Select the edge and press Ctrl+B.";

const REPLY_CHUNKS: readonly UIMessageChunk[] = [
  { type: "start", messageId: "r1" },
  { type: "start-step" },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: REPLY },
  { type: "text-end", id: "t1" },
  { type: "finish-step" },
  { type: "finish" },
];

const QUESTION_MESSAGE: UIMessage = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: QUESTION }],
};

const REPLY_MESSAGE: UIMessage = {
  id: "r0",
  role: "assistant",
  parts: [{ type: "text", text: REPLY }],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// Opens the chat with its saved messages, as its page does.
async function openChat(messages: UIMessage[]): Promise<void> {
  await render(
    <ChatView
      chatId={chatIdFixture()}
      viewer={userIdFixture()}
      initialMessages={messages}
      buddyName={BUDDY_NAME}
    />,
  );
}

describe("use_case_reply_fails", () => {
  test("a chat reopened after its reply failed says the message has no reply, and Retry reply gets it", async () => {
    const held = holdBeforeChunk(REPLY_CHUNKS, REPLY_CHUNKS.length);
    const fetchMock = answerChat(held.response);
    held.release();
    await openChat([QUESTION_MESSAGE]);
    const noReply = page.getByRole("status").filter({
      hasText: CHAT_COPY.noReplyYet(BUDDY_NAME),
    });

    await expect.element(noReply).toBeVisible();
    await noReply.getByRole("button", { name: IMAGE_COPY.retry }).click();

    await expect
      .element(page.getByRole("listitem").last().getByText(REPLY))
      .toBeVisible();
    await expect.element(noReply).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      message: { id: QUESTION_MESSAGE.id },
    });
  });

  test("a chat whose last message has its reply says nothing is missing", async () => {
    await openChat([QUESTION_MESSAGE, REPLY_MESSAGE]);

    await expect
      .element(page.getByRole("listitem").last().getByText(REPLY))
      .toBeVisible();
    expect(
      page.getByText(CHAT_COPY.noReplyYet(BUDDY_NAME)).elements(),
    ).toHaveLength(0);
  });
});
