// A new chat's opening: the tutor's first message, written in the chat's
// persona from its project's memory before the user writes anything. It
// sums up what the memory holds, if anything, then asks one question: the
// next thing the project interview still needs (interview-prompt.ts) or,
// once the interview is done, what to work on. It is a model call of its
// own, made outside a reply, and before the chat is saved, so a chat exists
// only once Claude has opened it.
import { generateId, streamText } from "ai";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { MESSAGE_ID } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import type { PersonaSnapshot } from "@/personas/index.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { tutorModel } from "@/tutor/model.ts";
import { renderTutorInstructions } from "@/tutor/system-prompt.ts";

// How long starting a chat waits for the opening before Claude counts as
// unavailable.
const OPENING_TIMEOUT_MS = 30_000;

// The chat to open, before it is saved: the quota grant of its owner, who the
// opening is charged to, its project's name and memory, and its persona.
interface ChatOpeningRequest {
  readonly grant: QuotaGrant;
  readonly projectName: string;
  readonly memory: Memory;
  readonly persona: PersonaSnapshot;
}

// Claude's opening text, or the failure that kept Claude from writing one.
// It is awaited whole rather than streamed, because the chat page shows it
// once the chat exists.
async function openingText({
  grant,
  projectName,
  memory,
  persona,
}: ChatOpeningRequest): Promise<{ text: string } | { failure: unknown }> {
  try {
    // The model's own error. The awaited text either ignores it or rejects
    // with an error that only says no text came.
    let modelError: unknown;
    const result = streamText({
      model: tutorModel(grant, persona.parts.neutralKickoff),
      instructions: renderTutorInstructions({ projectName, persona, memory }),
      messages: [{ role: "user", content: persona.parts.openingKickoff }],
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

// The tutor's first message in a new chat, or undefined when Claude can't
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
