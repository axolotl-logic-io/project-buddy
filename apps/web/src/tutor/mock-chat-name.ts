// What the mock says when asked to name a chat, with TUTOR_MODEL=mock: a
// name made from the conversation it is sent, so tests can tell which naming
// call named the chat.
import { isNeutralKickoff } from "@/tutor/chat-kickoff.ts";
import type { MockConversation, MockStep } from "@/tutor/mock-script.ts";

// How much of the chat's first message a mock chat name quotes.
const NAME_QUOTE_LENGTH = 30;

const LINE_BREAK = /\r?\n/u;

// The name the mock gives a chat whose first message is firstMessage, when
// it is sent messageCount messages: the start of the first message's first
// line and the count, such as "Bevel a donut (2 messages)".
function mockChatName(firstMessage: string, messageCount: number): string {
  const [firstLine = ""] = firstMessage.trim().split(LINE_BREAK);
  let count = `${messageCount} messages`;
  if (messageCount === 1) {
    count = "1 message";
  }
  return `${firstLine.slice(0, NAME_QUOTE_LENGTH).trim()} (${count})`;
}

// The chat's messages in the naming call, one text each, and her first one.
// A chat that opens with the tutor's opening is sent after the neutral
// kickoff (chat-kickoff.ts), which is not one of its messages, and her first
// message follows the opening.
function chatMessagesOf(earlierTexts: readonly string[]): {
  messages: readonly string[];
  herFirst: string;
} {
  const [first = "", , afterOpening = ""] = earlierTexts;
  if (isNeutralKickoff(first)) {
    return { messages: earlierTexts.slice(1), herFirst: afterOpening };
  }
  return { messages: earlierTexts, herFirst: first };
}

// Names the chat from the messages it is sent, as mockChatName says.
function mockChatNameScript(
  _userText: string,
  { earlierTexts }: MockConversation,
): readonly MockStep[] {
  const { messages, herFirst } = chatMessagesOf(earlierTexts);
  return [{ text: mockChatName(herFirst, messages.length), toolCalls: [] }];
}

export { mockChatName, mockChatNameScript };
