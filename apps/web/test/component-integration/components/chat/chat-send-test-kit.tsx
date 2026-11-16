// A quest panel inside a conversation, as the panel tests render it: the
// panel's controls send their commands to send, a mock that by default
// answers that the command ran, with no note.

import type { JSX, ReactNode } from "react";
import { type Mock, vi } from "vitest";
import {
  type ChatSend,
  ChatSendContext,
  type ChatSendResult,
} from "@/components/chat/chat-send.ts";

const SENT: ChatSendResult = { sent: true };

function chatSendMock(): Mock<ChatSend> {
  return vi.fn<ChatSend>().mockResolvedValue(SENT);
}

function inConversation(send: ChatSend, children: ReactNode): JSX.Element {
  return (
    <ChatSendContext.Provider value={send}>{children}</ChatSendContext.Provider>
  );
}

// The texts send was called with, in order.
function sentTexts(send: Mock<ChatSend>): readonly string[] {
  return send.mock.calls.map(([text]) => text);
}

export { chatSendMock, inConversation, sentTexts };
