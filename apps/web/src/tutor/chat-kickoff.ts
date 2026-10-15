// How every model call's conversation starts with the user, as Claude
// needs: a chat begins with the tutor's opening (chat-opening.ts), so the
// conversation the model sees starts with a message from the user's side
// that the user never sees. The opening's own call sends the opening
// kickoff, which asks for the opening. Every other call that would start
// with the tutor gets the neutral kickoff from the userFirst middleware,
// which src/tutor/model.ts wraps every model in. Both kickoffs are buddy
// parts, whose defaults are here, with the recognisers the mock reads them
// by: the mock knows them by text, since position can't tell a chat the site
// started from one a test seeded.
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Message,
  LanguageModelV4Middleware,
  LanguageModelV4Prompt,
} from "@ai-sdk/provider";

// The openingKickoff part's default: the request for a new chat's opening.
// It suits every chat: only the project's interview chat has the interview
// in its prompt, so only there does the interview set the question.
const OPENING_KICKOFF =
  "I have just started this chat. Open it with a brief synopsis of what the project's memory already holds, if it holds anything, then ask me one question: the next thing the project interview still needs, if this chat interviews me and the interview is not done, or else what to work on, such as the next milestone.";

// The neutralKickoff part's default: the user's side of a chat before the
// tutor's opening, in replies and naming calls. It asks for nothing, so the
// opening's instructions stay in the opening's call.
const NEUTRAL_KICKOFF = "I have started this chat.";

// The user's turn that says kickoff.
function kickoffTurn(kickoff: string): LanguageModelV4Message {
  return { role: "user", content: [{ type: "text", text: kickoff }] };
}

// Whether text is the opening kickoff's default, so the mock tutor can write
// an opening.
function isOpeningKickoff(text: string): boolean {
  return text === OPENING_KICKOFF;
}

// Whether text is the neutral kickoff's default, so the mock can leave it
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
// with neutralKickoff where it would start with the tutor.
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

export {
  isNeutralKickoff,
  isOpeningKickoff,
  NEUTRAL_KICKOFF,
  OPENING_KICKOFF,
  userFirst,
};
