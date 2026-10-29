// A new chat's opening: the buddy's first message, written in the chat's
// buddy from its project's memory before the user writes anything. It
// sums up what the memory holds, if anything, then asks one question: in the
// project's interview chat, the next thing the interview still needs
// (interview-prompt.ts) or, once the interview is done, what to work on. It is a model call of its
// own, made outside a reply, and before the chat is saved, so a chat exists
// only once Claude has opened it.
import { generateId, streamText } from "ai";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { MESSAGE_ID } from "@/ids.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { replyModel } from "@/replies/model.ts";
import {
  type ReplyPromptContext,
  renderReplyInstructions,
} from "@/replies/system-prompt.ts";

// How long starting a chat waits for the opening before Claude counts as
// unavailable.
const OPENING_TIMEOUT_MS = 30_000;

// The chat to open, before it is saved: the quota grant of its owner, who the
// opening is charged to, and its prompt's context (system-prompt.ts): its
// project, its buddy, the owner's name and the account's hidden flags.
interface ChatOpeningRequest extends ReplyPromptContext {
  readonly grant: QuotaGrant;
}

// Claude's opening text, or the failure that kept Claude from writing one.
// It is awaited whole rather than streamed, because the chat page shows it
// once the chat exists.
async function openingText({
  grant,
  ...context
}: ChatOpeningRequest): Promise<{ text: string } | { failure: unknown }> {
  const { buddy } = context;
  try {
    // The model's own error. The awaited text either ignores it or rejects
    // with an error that only says no text came.
    let modelError: unknown;
    const result = streamText({
      model: replyModel(grant, buddy.parts.neutralKickoff),
      instructions: renderReplyInstructions(context),
      messages: [{ role: "user", content: buddy.parts.openingKickoff }],
      abortSignal: AbortSignal.timeout(OPENING_TIMEOUT_MS),
      onError: ({ error }: { error: unknown }): void => {
        modelError = error;
      },
    });
    let text = "";
    try {
      text = await result.text;
    } catch (error) {
      modelError ??= error;
    }
    if (modelError !== undefined) {
      return { failure: modelError };
    }
    if (text.trim() === "") {
      return { failure: new Error("The chat opening has no text") };
    }
    return { text: text.trim() };
  } catch (error) {
    return { failure: error };
  }
}

// The buddy's first message in a new chat, or undefined when Claude can't
// write it: any model error, an empty answer or the timeout. That failure is
// logged once here, and the caller saves no chat, since without Claude there
// is no chat to have.
async function writeChatOpening(
  request: ChatOpeningRequest,
): Promise<NewMessage | undefined> {
  const opening = await openingText(request);
  if ("failure" in opening) {
    toAppError(opening.failure, "chat opening");
    return undefined;
  }
  return {
    id: MESSAGE_ID.parse(generateId()),
    role: "assistant",
    parts: [{ type: "text", text: opening.text }],
  };
}

export type { ChatOpeningRequest };
export { writeChatOpening };
