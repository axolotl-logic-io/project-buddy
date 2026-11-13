import { mockErrorReply } from "@/replies/mock-error.ts";
import type { MockConversation, MockStep } from "@/replies/mock-script.ts";
import { startingContextInPrompt } from "@/replies/starting-context.ts";

const MOCK_ERROR_IN_PROMPT = /\/mock-error (?<errorType>[a-z_]+)/u;

// The mock opening of the quest's interview chat while the quest's
// memory is empty.
// The mock opening of any other chat while the quest's memory is empty.
const MOCK_CHAT_QUESTION =
  "The mock construct starts a conversation. What would you like to work on?";

// The failure a "/mock-error <type>" in the prompt asks for, or undefined.
function mockErrorInPrompt(prompt: string): readonly MockStep[] | undefined {
  const mockError = MOCK_ERROR_IN_PROMPT.exec(prompt)?.groups;
  if (mockError === undefined) {
    return undefined;
  }
  const { errorType = "" } = mockError;
  return mockErrorReply(errorType);
}

function mockOpeningReply({
  systemTexts,
}: MockConversation): readonly MockStep[] {
  const prompt = systemTexts.join("\n\n");
  const failure = mockErrorInPrompt(prompt);
  if (failure !== undefined) {
    return failure;
  }
  const context = startingContextInPrompt(prompt);
  if (context === "") {
    return [{ text: MOCK_CHAT_QUESTION, toolCalls: [] }];
  }
  return [
    {
      text: [
        "The mock construct acknowledges the starting context:",
        "",
        context,
        "",
        "What would you like to work on next?",
      ].join("\n"),
      toolCalls: [],
    },
  ];
}

export { MOCK_CHAT_QUESTION, mockOpeningReply };
