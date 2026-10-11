// The mock tutor's "/mock-system-prompt" command: asked it as the whole of
// the user's last message, the mock replies with the text of its system
// messages, so end-to-end tests can check what the prompt holds, such as the
// project's memory.
import type { LanguageModelV4Prompt } from "@ai-sdk/provider";
import type { MockStep } from "@/tutor/mock-model.ts";

const MOCK_SYSTEM_PROMPT_COMMAND = "/mock-system-prompt";

// A fence no prompt line starts with, so the reply shows the prompt as it is
// rather than as Markdown.
const PROMPT_FENCE = "~~~~~~~~";

function lastUserText(prompt: LanguageModelV4Prompt): string {
  const message = prompt.findLast(({ role }) => role === "user");
  if (message?.role !== "user") {
    return "";
  }
  return message.content
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("\n");
}

// The reply to the command, or undefined if the user's last message is not
// the command.
function mockSystemPromptStep(
  prompt: LanguageModelV4Prompt,
): MockStep | undefined {
  if (lastUserText(prompt).trim() !== MOCK_SYSTEM_PROMPT_COMMAND) {
    return undefined;
  }
  const systemText = prompt
    .flatMap((message) => {
      if (message.role === "system") {
        return [message.content];
      }
      return [];
    })
    .join("\n\n");
  return {
    text: [`${PROMPT_FENCE}text`, systemText, PROMPT_FENCE].join("\n"),
    toolCalls: [],
  };
}

export { mockSystemPromptStep };
