// What the mock says when asked to name a chat, with TUTOR_MODEL=mock: a
// name made from the conversation it is sent, so tests can tell which naming
// call named the chat.
import type { MockConversation, MockStep } from "@/tutor/mock-script.ts";

// How much of the chat's first message a mock chat name quotes.
const NAME_QUOTE_LENGTH = 30;

const LINE_BREAK = /\r?\n/u;

// Names the chat with the start of its first message's first line and how
// many messages it has, such as "Bevel a donut (2 messages)".
function mockChatNameScript(
  _userText: string,
  { earlierTexts }: MockConversation,
): readonly MockStep[] {
  const [firstText = ""] = earlierTexts;
  const [firstLine = ""] = firstText.trim().split(LINE_BREAK);
  let count = `${earlierTexts.length} messages`;
  if (earlierTexts.length === 1) {
    count = "1 message";
  }
  return [
    {
      text: `${firstLine.slice(0, NAME_QUOTE_LENGTH).trim()} (${count})`,
      toolCalls: [],
    },
  ];
}

export { mockChatNameScript };
