// How every chat's conversation starts for the model: with the kickoff, a
// message from the user's side that the model sees and the user never does.
// Claude needs a conversation to begin with the user, and a chat begins with
// the tutor's opening (chat-opening.ts), so the kickoff asks for it.
import type { ModelMessage, UserModelMessage } from "ai";

const CHAT_KICKOFF: UserModelMessage = {
  role: "user",
  content:
    "I have just started this chat. Open it with a brief synopsis of what the project's memory already holds, if it holds anything, then ask me one question: the next thing the project interview still needs or, once the interview is done, what to work on, such as the next milestone.",
};

// The conversation to send the model: messages, after the kickoff unless
// they start with a message from the user, as chats started before openings
// existed do.
function withChatKickoff(messages: readonly ModelMessage[]): ModelMessage[] {
  const [first] = messages;
  if (first?.role === "user") {
    return [...messages];
  }
  return [CHAT_KICKOFF, ...messages];
}

// Whether text is the kickoff's, so the mock tutor can write an opening.
function isChatKickoff(text: string): boolean {
  return text === CHAT_KICKOFF.content;
}

export { isChatKickoff, withChatKickoff };
