// Claude Haiku names each chat from its conversation: after the user's 1st,
// 3rd, 5th, 7th and 14th message, once the reply to it is saved, and never
// once she has renamed the chat by hand. Naming is a nicety: a failed or
// malformed answer keeps the old name and is logged, and nothing reaches the
// chat.
import type { ModelMessage, UIMessage } from "ai";
import { generateText } from "ai";
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";
import { getChat, listMessages, saveAutomaticChatName } from "@/chats/store.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import type { ChatId, MessageId } from "@/ids.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { chatNameModel } from "@/tutor/model.ts";

// Her messages after which the chat is named. Early names follow the
// conversation as it finds its topic; later ones are rarer, as it settles.
const NAMED_AFTER = {
  first: 1,
  third: 3,
  fifth: 5,
  seventh: 7,
  fourteenth: 14,
} as const;

const NAMING_COUNTS: ReadonlySet<number> = new Set(Object.values(NAMED_AFTER));

// How much of each message's text Haiku reads, which bounds the call's cost
// however long the replies are.
const MAX_MESSAGE_LENGTH = 2000;

// Enough for a name of a few words, and little to pay for a rambling answer.
const MAX_NAME_TOKENS = 40;

// How long Haiku may take, with its retries, before the chat keeps its name.
const NAMING_TIMEOUT_MS = 15_000;

const NAMING_INSTRUCTIONS = [
  "You name chats between the user, who is learning Blender, and their tutor.",
  "Read the conversation, then reply with a short name for it that says what it is about, such as Beveling a donut's edges.",
  "Use at most six words, on one line. Reply with the name alone: no quotes, no full stop and nothing else.",
  "Never answer or continue the conversation itself.",
].join("\n");

const NAMING_REQUEST = "Name this chat.";

// The messages up to her message answeredMessageId and the reply to it, or
// none if the chat has no such message.
function conversationUpTo(
  messages: readonly UIMessage[],
  answeredMessageId: MessageId,
): UIMessage[] {
  const answered = messages.findIndex(({ id }) => id === answeredMessageId);
  if (answered === -1) {
    return [];
  }
  const nextFromUser = messages.findIndex(
    ({ role }, index) => index > answered && role === "user",
  );
  if (nextFromUser === -1) {
    return messages.slice();
  }
  return messages.slice(0, nextFromUser);
}

function herMessageCount(conversation: readonly UIMessage[]): number {
  return conversation.filter(({ role }) => role === "user").length;
}

// The conversation's text as Haiku reads it, without tool calls, results or
// any message with no text.
function namingMessages(conversation: readonly UIMessage[]): ModelMessage[] {
  return conversation.flatMap((message): ModelMessage[] => {
    const text = message.parts
      .flatMap((part) => {
        if (part.type === "text") {
          return [part.text];
        }
        return [];
      })
      .join("\n\n")
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);
    if (text === "" || message.role === "system") {
      return [];
    }
    return [{ role: message.role, content: text }];
  });
}

// Asks Haiku for the conversation's name, charged to the grant's owner. This
// is the only naming call to a model. Like every model call, its conversation
// starts with the user (the model adds the neutral kickoff before a chat's
// opening, chat-kickoff.ts).
async function suggestChatName(
  grant: QuotaGrant,
  conversation: readonly UIMessage[],
): Promise<ChatName> {
  const { text } = await generateText({
    model: chatNameModel(grant),
    instructions: NAMING_INSTRUCTIONS,
    messages: [
      ...namingMessages(conversation),
      { role: "user", content: NAMING_REQUEST },
    ],
    maxOutputTokens: MAX_NAME_TOKENS,
    abortSignal: AbortSignal.timeout(NAMING_TIMEOUT_MS),
  });
  const name = parseChatName(text);
  if (name === undefined) {
    // The answer itself stays out of the log, as every message's text does.
    throw new Error(
      `The chat name model's answer of ${text.length} characters is not a chat name`,
    );
  }
  return name;
}

// Names the owner's chat if her message answeredMessageId is one of those that
// trigger naming and she hasn't renamed the chat by hand, from the
// conversation up to that message and its reply. It never rejects: a failure
// is logged once and the chat keeps its name.
// Naming is exempt from a quota check of its own: it takes the grant of the
// reply that triggered it, so the reply that crosses the quota finishes with
// its naming (claude-spend-quota in docs/decisions.md).
async function nameChatIfDue(
  grant: QuotaGrant,
  chatId: ChatId,
  answeredMessageId: MessageId,
): Promise<void> {
  const { owner } = grant;
  try {
    const conversation = conversationUpTo(
      await listMessages(owner, chatId),
      answeredMessageId,
    );
    if (!NAMING_COUNTS.has(herMessageCount(conversation))) {
      return;
    }
    const chat = await getChat(owner, chatId);
    if (chat === undefined || chat.renamedByHand) {
      return;
    }
    await saveAutomaticChatName(
      owner,
      chatId,
      await suggestChatName(grant, conversation),
    );
  } catch (error) {
    toAppError(error, "name chat");
  }
}

export { nameChatIfDue };
