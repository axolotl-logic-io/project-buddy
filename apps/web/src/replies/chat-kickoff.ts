import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Message,
  LanguageModelV4Middleware,
  LanguageModelV4Prompt,
} from "@ai-sdk/provider";

const OPENING_REQUEST =
  "Open the conversation with a brief greeting and ask what the user wants to work on.";

// The user's side of a chat before the construct's opening, in replies and
// naming calls. It asks for nothing, so the
// opening's instructions stay in the opening's call.
const NEUTRAL_KICKOFF =
  "Application opening context, not a message from a person: this conversation has started. Do not count this context as a participant, attribute it to an unnamed author or mention this trigger in your reply.";

// The user's turn that says kickoff.
function kickoffTurn(kickoff: string): LanguageModelV4Message {
  return { role: "user", content: [{ type: "text", text: kickoff }] };
}

// Whether text is the neutral kickoff, so the mock can leave it
// out of a chat's messages.
function isNeutralKickoff(text: string): boolean {
  return text === NEUTRAL_KICKOFF;
}

// The prompt with the neutral turn after its system messages, unless its
// first other message is the user's. The system messages are left as they
// are, so the prompt cache still reads them.
function withUserFirst(
  prompt: LanguageModelV4Prompt,
  neutralTurn: LanguageModelV4Message,
): LanguageModelV4Prompt {
  const firstTurn = prompt.findIndex(({ role }) => role !== "system");
  if (prompt[firstTurn]?.role === "user") {
    return prompt;
  }
  if (firstTurn === -1) {
    return [...prompt, neutralTurn];
  }
  return [
    ...prompt.slice(0, firstTurn),
    neutralTurn,
    ...prompt.slice(firstTurn),
  ];
}

// The middleware that makes every call's conversation start with the user,
// with neutralKickoff where it would start with the construct.
function userFirst(neutralKickoff: string): LanguageModelV4Middleware {
  const neutralTurn = kickoffTurn(neutralKickoff);
  return {
    specificationVersion: "v4",
    transformParams: async ({
      params,
    }: {
      params: LanguageModelV4CallOptions;
    }): Promise<LanguageModelV4CallOptions> => ({
      ...params,
      prompt: withUserFirst(params.prompt, neutralTurn),
    }),
  };
}

export { isNeutralKickoff, NEUTRAL_KICKOFF, OPENING_REQUEST, userFirst };
