// The mock construct's opening for a new chat with no prepared opening, such as
// one in a construct of the user's own that has been edited (chat-opening.ts),
// its reply to a built-in activity's kickoff: the project's memory as its prompt gives
// it, then one question, or only one question while the memory is empty:
// the interview's first in a chat whose activity is the interview, and what
// to work on in any other chat. So the end-to-end tests can see what the
// opening knew. An opening
// whose prompt holds "/mock-error <Anthropic error type>", as a project's
// name can, fails the way mock-error.ts says, so the tests can start a chat
// while Claude is down: nobody types into an opening's conversation.

import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import { memoryInPrompt } from "@/replies/memory-prompt.ts";
import { mockErrorReply } from "@/replies/mock-error.ts";
import type { MockConversation, MockStep } from "@/replies/mock-script.ts";

const MOCK_ERROR_IN_PROMPT = /\/mock-error (?<errorType>[a-z_]+)/u;

// The mock opening of the project's interview chat while the project's
// memory is empty.
const MOCK_FIRST_QUESTION =
  "The mock construct starts the interview. What would you like to make or learn?";

// The mock opening of any other chat while the project's memory is empty.
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
  const memory = memoryInPrompt(prompt);
  if (memory === "") {
    if (prompt.includes(getActivity(INTERVIEW_ACTIVITY_ID).definition.prompt)) {
      return [{ text: MOCK_FIRST_QUESTION, toolCalls: [] }];
    }
    return [{ text: MOCK_CHAT_QUESTION, toolCalls: [] }];
  }
  return [
    {
      text: [
        "The mock construct sums up the quest's Journal:",
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
