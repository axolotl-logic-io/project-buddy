// The mock buddy's "/mock-system-prompt" command: the mock replies with the
// text of its system messages, so end-to-end tests can check what the prompt
// holds, such as the project's memory.
import type { MockConversation, MockStep } from "@/replies/mock-script.ts";

// A fence no prompt line starts with, so the reply shows the prompt as it is
// rather than as Markdown.
const PROMPT_FENCE = "~~~~~~~~";

// The reply to the command: every system message, fenced.
function mockSystemPromptReply(
  _argument: string,
  { systemTexts }: MockConversation,
): MockStep[] {
  return [
    {
      text: [
        `${PROMPT_FENCE}text`,
        systemTexts.join("\n\n"),
        PROMPT_FENCE,
      ].join("\n"),
      toolCalls: [],
    },
  ];
}

export { mockSystemPromptReply };
