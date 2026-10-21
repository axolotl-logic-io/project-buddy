import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture } from "../id-fixtures.ts";

function renderChat(initialMessages: UIMessage[] = []): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={initialMessages}
      buddyName={getBuddy("mr-tee").name}
    />,
  );
}

function sendMessage(text = "How do I bevel?"): void {
  fireEvent.change(
    screen.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
    { target: { value: text } },
  );
  fireEvent.click(screen.getByRole("button", { name: CHAT_COPY.send }));
}

export { renderChat, sendMessage };
