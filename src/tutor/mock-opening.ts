// The mock tutor's opening for a new chat (chat-opening.ts), its reply to
// the app's kickoff: the project's memory as its prompt gives it, then one
// question, or only the interview's first question while the memory is
// empty. So the end-to-end tests can see what the opening knew.
import { memoryInPrompt } from "@/tutor/memory-prompt.ts";
import type { MockConversation, MockStep } from "@/tutor/mock-script.ts";

const FIRST_QUESTION =
  "The mock tutor starts the interview. What would you like to make or learn in Blender?";

function mockOpeningReply({
  systemTexts,
}: MockConversation): readonly MockStep[] {
  const memory = memoryInPrompt(systemTexts.join("\n\n"));
  if (memory === "") {
    return [{ text: FIRST_QUESTION, toolCalls: [] }];
  }
  return [
    {
      text: [
        "The mock tutor sums up the project's memory:",
        "",
        memory,
        "",
        "What would you like to work on next?",
      ].join("\n"),
      toolCalls: [],
    },
  ];
}

export { mockOpeningReply };
