import { generateId, streamText } from "ai";
import type { NewMessage } from "@/chats/chat-rows.ts";
import type { ConstructSnapshot } from "@/constructs/index.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { MESSAGE_ID } from "@/ids.ts";
import { OPENING_REQUEST } from "@/replies/chat-kickoff.ts";
import { replyModel } from "@/replies/model.ts";
import {
  type ReplyPromptContext,
  renderReplyInstructions,
} from "@/replies/system-prompt.ts";

// How long starting a chat waits for the opening before Claude counts as
// unavailable.
const OPENING_TIMEOUT_MS = 30_000;

interface ChatOpeningRequest {
  readonly construct: ConstructSnapshot;
  readonly context: () => Promise<Omit<ReplyPromptContext, "construct">>;
}

// The construct's message with this text.
function openingMessage(text: string): NewMessage {
  return {
    id: MESSAGE_ID.parse(generateId()),
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

// Claude's opening text, or the failure that kept Claude from writing one.
// It is awaited whole rather than streamed, because the chat page shows it
// once the chat exists.
async function openingText(
  context: ReplyPromptContext,
): Promise<{ text: string } | { failure: unknown }> {
  try {
    // The model's own error. The awaited text either ignores it or rejects
    // with an error that only says no text came.
    let modelError: unknown;
    const result = streamText({
      model: replyModel(),
      instructions: renderReplyInstructions(context),
      messages: [
        {
          role: "user",
          content: OPENING_REQUEST,
        },
      ],
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

async function chatOpening({
  construct,
  context,
}: ChatOpeningRequest): Promise<NewMessage | undefined> {
  const opening = await openingText({
    ...(await context()),
    construct,
  });
  if ("failure" in opening) {
    toAppError(opening.failure, "chat opening");
    return undefined;
  }
  return openingMessage(opening.text);
}

export type { ChatOpeningRequest };
export { chatOpening };
