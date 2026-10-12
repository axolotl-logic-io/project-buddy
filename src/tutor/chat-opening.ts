// A new chat's opening: the tutor's first message, written in the chat's
// persona from its project's memory before the user writes anything. It
// sums up what the memory holds, if anything, then asks one question: the
// next thing the project interview still needs (interview-prompt.ts) or,
// once the interview is done, what to work on. It is a model call of its
// own, made outside a reply.
import { generateId, streamText } from "ai";
import type { ChatWithProject, NewMessage } from "@/chats/store.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { MESSAGE_ID } from "@/ids.ts";
import { isMemoryEmpty, type Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { getPersona } from "@/personas/index.ts";
import { withChatKickoff } from "@/tutor/chat-kickoff.ts";
import { tutorModel } from "@/tutor/model.ts";
import { renderTutorInstructions } from "@/tutor/system-prompt.ts";
import { COPY } from "@/ui/copy.ts";

// How long starting a chat waits for the opening before it uses the fixed
// one.
const OPENING_TIMEOUT_MS = 30_000;

// The fixed opening, once the failure that called for it is logged: the
// interview's first question while the memory is empty, and otherwise a
// question about what to work on, with no synopsis.
function fallbackOpening(memory: Memory, failure: unknown): string {
  toAppError(failure, "chat opening");
  let text: string = COPY.opening.whatNext;
  if (isMemoryEmpty(memory)) {
    text = COPY.opening.firstQuestion;
  }
  return text;
}

// Claude's opening for the chat, or the fixed one. It is awaited whole
// rather than streamed, because the chat page shows it once the chat exists.
async function openingText(chat: ChatWithProject): Promise<string> {
  const memory = await readMemory(chat.projectId);
  try {
    // The model's own error. The awaited text either ignores it or rejects
    // with an error that only says no text came.
    let modelError: unknown;
    const result = streamText({
      model: tutorModel(),
      instructions: renderTutorInstructions({
        chat,
        persona: getPersona(chat.personaId),
        memory,
      }),
      messages: withChatKickoff([]),
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
      return fallbackOpening(memory, modelError);
    }
    if (text.trim() === "") {
      return fallbackOpening(memory, new Error("The chat opening has no text"));
    }
    return text.trim();
  } catch (error) {
    return fallbackOpening(memory, error);
  }
}

// The tutor's first message in a new chat. It never fails because of
// Claude: when Claude can't write the opening, the failure is logged once
// and the message is a fixed one instead. A failure to read the project's
// memory is thrown, as storage failures are.
async function writeChatOpening(chat: ChatWithProject): Promise<NewMessage> {
  return {
    id: MESSAGE_ID.parse(generateId()),
    role: "assistant",
    parts: [{ type: "text", text: await openingText(chat) }],
  };
}

export { writeChatOpening };
