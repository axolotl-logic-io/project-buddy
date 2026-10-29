// The mock buddy's opening for a new chat (chat-opening.ts), its reply to
// the app's kickoff: the project's memory as its prompt gives it, then one
// question, or only one question while the memory is empty: the interview's
// first in the project's interview chat, whose prompt holds the interview,
// and what to work on in any other chat. So the end-to-end tests can see what the opening knew. An opening
// whose prompt holds "/mock-error <Anthropic error type>", as a project's
// name can, fails the way mock-error.ts says, so the tests can start a chat
// while Claude is down: nobody types into an opening's conversation.
import { INTERVIEW_PROMPT } from "@/replies/interview-prompt.ts";
import { memoryInPrompt } from "@/replies/memory-prompt.ts";
import { mockErrorReply } from "@/replies/mock-error.ts";
import type { MockConversation, MockStep } from "@/replies/mock-script.ts";

const MOCK_ERROR_IN_PROMPT = /\/mock-error (?<errorType>[a-z_]+)/u;

// The mock opening of the project's interview chat while the project's
// memory is empty.
const MOCK_FIRST_QUESTION =
  "The mock buddy starts the interview. What would you like to make or learn?";

// The mock opening of any other chat while the project's memory is empty.
const MOCK_LESSON_QUESTION =
  "The mock buddy starts a lesson. What would you like to work on?";

function mockOpeningReply({
  systemTexts,
}: MockConversation): readonly MockStep[] {
  const prompt = systemTexts.join("\n\n");
  const mockError = MOCK_ERROR_IN_PROMPT.exec(prompt)?.groups;
  if (mockError !== undefined) {
    const { errorType = "" } = mockError;
    return mockErrorReply(errorType);
  }
  const memory = memoryInPrompt(prompt);
  if (memory === "") {
    if (prompt.includes(INTERVIEW_PROMPT)) {
      return [{ text: MOCK_FIRST_QUESTION, toolCalls: [] }];
    }
    return [{ text: MOCK_LESSON_QUESTION, toolCalls: [] }];
  }
  return [
    {
      text: [
        "The mock buddy sums up the project's memory:",
        "",
        memory,
        "",
        "What would you like to work on next?",
      ].join("\n"),
      toolCalls: [],
    },
  ];
}

export { MOCK_FIRST_QUESTION, MOCK_LESSON_QUESTION, mockOpeningReply };
