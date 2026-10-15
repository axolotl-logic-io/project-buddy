// For the tests that show the mock tutor's Markdown reply as a chat saved it
// (chat-message.browser.test.tsx and the chat page's browser test).
import { defaultMockScript } from "@/tutor/mock-script.ts";

// The mock tutor's reply to /mock-markdown: a heading, emphasis, lists, a
// table, a manual link and a Python block, longer than a phone's screen.
function markdownReplyText(): string {
  const [step] = defaultMockScript("/mock-markdown", {
    systemTexts: [],
    earlierTexts: [],
    toolResults: [],
    answerNow: false,
  });
  if (step === undefined) {
    throw new Error("/mock-markdown has no reply");
  }
  return step.text;
}

export { markdownReplyText };
