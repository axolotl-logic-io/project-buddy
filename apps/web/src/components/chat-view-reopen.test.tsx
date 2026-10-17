// "use_case_reopen_chat" in use-cases/chats.md, as she sees it in the page:
// the saved conversation shows in order, each reply under the buddy's name
// and with its formatting, and she can send a new message. That the
// conversation is saved, in that order, is src/app/api/chat/
// route.server.test.ts's; that the project's chat list links each chat by
// its name is chat-list.test.tsx's.
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { chatIdFixture } from "@/id-fixtures.ts";
import { mockReplyText } from "@/tutor/mock-markdown-test-kit.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("@/components/router-test-kit.ts"));

const BUDDY_NAME: string = getBuddy("mr-tee").name;
const FIRST = "How do I bevel an edge?";
const SECOND = "Can I make it rounder?";
// The last line of the mock tutor's reply, inside its Python block.
const MOCK_REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";

function savedMessage(
  id: string,
  role: UIMessage["role"],
  text: string,
): UIMessage {
  return { id, role, parts: [{ type: "text", text }] };
}

// Two exchanges, as the chat saved them.
const SAVED_CONVERSATION: UIMessage[] = [
  savedMessage("m1", "user", FIRST),
  savedMessage("m2", "assistant", mockReplyText(FIRST)),
  savedMessage("m3", "user", SECOND),
  savedMessage("m4", "assistant", mockReplyText(SECOND)),
];

function reopenChat(): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={SAVED_CONVERSATION}
      buddyName={BUDDY_NAME}
    />,
  );
}

// The conversation's messages, oldest first.
function shownMessages(): HTMLElement[] {
  return Array.from(
    screen.getByRole("list", { name: CHAT_COPY.conversationLabel }).children,
  ).filter((child) => child instanceof HTMLElement);
}

// Who a shown message is from, as its heading line names them.
function speaker(message: HTMLElement): string | null | undefined {
  return message.firstElementChild?.textContent;
}

describe("use_case_reopen_chat", () => {
  test("shows every message in order, each reply under the buddy's name", () => {
    reopenChat();

    const messages = shownMessages();
    expect(messages.map(speaker)).toEqual([
      CHAT_COPY.you,
      BUDDY_NAME,
      CHAT_COPY.you,
      BUDDY_NAME,
    ]);
    const [first, firstReply, second, secondReply] = messages;
    expect(first).toHaveTextContent(FIRST);
    expect(firstReply).toHaveTextContent(`You said: "${FIRST}"`);
    expect(second).toHaveTextContent(SECOND);
    expect(secondReply).toHaveTextContent(`You said: "${SECOND}"`);
  });

  test("replies keep their formatting", () => {
    reopenChat();

    const [, firstReply] = shownMessages();
    if (firstReply === undefined) {
      throw new Error("The first reply isn't shown");
    }
    const reply = within(firstReply);
    expect(
      reply.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Select the edges.", "Press Ctrl+B to bevel them."]);
    expect(reply.getByRole("code")).toHaveTextContent(MOCK_REPLY_END);
    expect(firstReply).not.toHaveTextContent("**");
    expect(firstReply).not.toHaveTextContent("```");
  });

  test("she can send a new message", () => {
    reopenChat();

    fireEvent.change(
      screen.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
      { target: { value: "One more thing" } },
    );
    expect(screen.getByRole("button", { name: CHAT_COPY.send })).toBeEnabled();
  });
});
