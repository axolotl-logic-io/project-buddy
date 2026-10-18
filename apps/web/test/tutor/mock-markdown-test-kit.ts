// For the tests that show or save the mock tutor's Markdown replies
// (chat-message.browser.test.tsx, the chat page's browser test,
// chat-view-reopen.test.tsx and test/test-database/chat-test-kit.ts).
import {
  defaultMockScript,
  type MockConversation,
} from "@/tutor/mock-script.ts";

// A conversation with nothing before her message, as the mock reads it.
const NO_CONVERSATION: MockConversation = {
  systemTexts: [],
  earlierTexts: [],
  toolResults: [],
  answerNow: false,
};

// The mock tutor's reply to /mock-markdown: a heading, emphasis, lists, a
// table, a manual link and a Python block, longer than a phone's screen.
function markdownReplyText(): string {
  const [step] = defaultMockScript("/mock-markdown", NO_CONVERSATION);
  if (step === undefined) {
    throw new Error("/mock-markdown has no reply");
  }
  return step.text;
}

// The whole of the mock tutor's reply to her message userText, in a chat
// with no tool calls.
function mockReplyText(userText: string): string {
  return defaultMockScript(userText, NO_CONVERSATION)
    .map(({ text }) => text)
    .join("");
}

export { markdownReplyText, mockReplyText };
