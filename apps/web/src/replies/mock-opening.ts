// The mock buddy's opening for a new chat (chat-opening.ts), its reply to
// a built-in activity's kickoff: the project's memory as its prompt gives
// it, then one question, or only one question while the memory is empty:
// the interview's first in a chat whose activity is the interview, and what
// to work on in any other chat. So the end-to-end tests can see what the
// opening knew. An opening
// whose prompt holds "/mock-error <Anthropic error type>", as a project's
// name can, fails the way mock-error.ts says, so the tests can start a chat
// while Claude is down: nobody types into an opening's conversation.
import { getActivity, INTERVIEW_ACTIVITY_ID } from "@/activities/index.ts";
import { memoryInPrompt } from "@/replies/memory-prompt.ts";
import { mockErrorReply } from "@/replies/mock-error.ts";
import type { MockConversation, MockStep } from "@/replies/mock-script.ts";

const MOCK_ERROR_IN_PROMPT = /\/mock-error (?<errorType>[a-z_]+)/u;

// The mock opening of the project's interview chat while the project's
// memory is empty.
const MOCK_FIRST_QUESTION =
  "The mock buddy starts the interview. What would you like to make or learn?";

// The mock opening of any other chat while the project's memory is empty.
const MOCK_CHAT_QUESTION =
  "The mock buddy starts a chat. What would you like to work on?";

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
    if (
      prompt.includes(getActivity(INTERVIEW_ACTIVITY_ID).parts.instructions)
    ) {
      return [{ text: MOCK_FIRST_QUESTION, toolCalls: [] }];
    }
    return [{ text: MOCK_CHAT_QUESTION, toolCalls: [] }];
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

export { MOCK_CHAT_QUESTION, MOCK_FIRST_QUESTION, mockOpeningReply };
