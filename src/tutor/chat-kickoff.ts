// How every model call's conversation starts with the user, as Claude
// needs: a chat begins with the tutor's opening (chat-opening.ts), so the
// conversation the model sees starts with a message from the user's side
// that the user never sees. The opening's own call sends the opening
// kickoff, which asks for the opening. Every other call that would start
// with the tutor gets the neutral kickoff from the userFirst middleware,
// which src/tutor/model.ts wraps every model in.
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Message,
  LanguageModelV4Middleware,
  LanguageModelV4Prompt,
} from "@ai-sdk/provider";
import type { UserModelMessage } from "ai";

// The request for a new chat's opening.
const OPENING_KICKOFF: UserModelMessage = {
  role: "user",
  content:
    "I have just started this chat. Open it with a brief synopsis of what the project's memory already holds, if it holds anything, then ask me one question: the next thing the project interview still needs or, once the interview is done, what to work on, such as the next milestone.",
};

// The user's side of a chat before the tutor's opening, in replies and
// naming calls: it asks for nothing, so the opening's instructions stay in
// the opening's call.
const NEUTRAL_KICKOFF = "I have started this chat.";

const NEUTRAL_TURN: LanguageModelV4Message = {
  role: "user",
  content: [{ type: "text", text: NEUTRAL_KICKOFF }],
};

// Whether text is the opening kickoff's, so the mock tutor can write an
// opening.
function isOpeningKickoff(text: string): boolean {
  return text === OPENING_KICKOFF.content;
}

// Whether text is the neutral kickoff's, so the mock can leave it out of a
// chat's messages.
function isNeutralKickoff(text: string): boolean {
  return text === NEUTRAL_KICKOFF;
}

// The prompt with the neutral turn after its system messages, unless its
// first other message is the user's. The system messages are left as they
// are, so the prompt cache still reads them.
function withUserFirst(prompt: LanguageModelV4Prompt): LanguageModelV4Prompt {
  const firstTurn = prompt.findIndex(({ role }) => role !== "system");
  if (prompt[firstTurn]?.role === "user") {
    return prompt;
  }
  if (firstTurn === -1) {
    return [...prompt, NEUTRAL_TURN];
  }
  return [
    ...prompt.slice(0, firstTurn),
    NEUTRAL_TURN,
    ...prompt.slice(firstTurn),
  ];
}

// The middleware that makes every call's conversation start with the user.
const userFirst: LanguageModelV4Middleware = {
  specificationVersion: "v4",
  transformParams: async ({
    params,
  }: {
    params: LanguageModelV4CallOptions;
  }): Promise<LanguageModelV4CallOptions> => ({
    ...params,
    prompt: withUserFirst(params.prompt),
  }),
};

export {
  isNeutralKickoff,
  isOpeningKickoff,
  NEUTRAL_KICKOFF,
  OPENING_KICKOFF,
  userFirst,
};
