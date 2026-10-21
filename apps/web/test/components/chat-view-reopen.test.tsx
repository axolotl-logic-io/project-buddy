// "use_case_reopen_chat" in use-cases/chats.md, as she sees it in the page:
// the saved conversation shows in order, each reply under the buddy's name
// and with its formatting, and she can send a new message. That the
// conversation is saved, in that order, is src/app/api/chat/
// route.server.test.ts's; that the project's chat list links each chat by
// its name is chat-list.test.tsx's.
import { screen, within } from "@testing-library/react";
import type { UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { mockReplyText } from "../tutor/mock-markdown-test-kit.ts";
import {
  answerChat,
  replyChunks,
  replyResponse,
} from "./chat-stream-test-kit.ts";
import { renderChat, sendMessage } from "./chat-view-test-kit.tsx";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const BUDDY_NAME: string = getBuddy("mr-tee").name;
const FIRST = "How do I bevel an edge?";
const SECOND = "Can I make it rounder?";

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
  renderChat(SAVED_CONVERSATION);
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

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    expect(reply.getAllByRole("listitem")).toHaveLength(2);
    expect(reply.getByRole("code")).not.toBeEmptyDOMElement();
    expect(firstReply).not.toHaveTextContent("**");
    expect(firstReply).not.toHaveTextContent("```");
  });

  test("she can send a new message", async () => {
    answerChat(replyResponse(replyChunks("A new answer after reopening")));
    reopenChat();

    sendMessage("One more thing");
    expect(
      await screen.findByText("A new answer after reopening"),
    ).toBeVisible();
    const messages = shownMessages();
    expect(messages).toHaveLength(SAVED_CONVERSATION.length + 2);
    expect(messages[SAVED_CONVERSATION.length - 1]).toHaveTextContent(SECOND);
    expect(messages.at(-2)).toHaveTextContent("One more thing");
    expect(messages.at(-1)).toHaveTextContent(
      `${BUDDY_NAME}A new answer after reopening`,
    );
  });
});
