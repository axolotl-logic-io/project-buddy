// The interview's opening question, which the tutor writes in the chat's
// persona when a project is created. It is a model call of its own, made
// outside a reply.
import { generateId, streamText } from "ai";
import type { ChatWithProject, NewMessage } from "@/chats/store.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { MESSAGE_ID } from "@/ids.ts";
import { getPersona } from "@/personas/index.ts";
import { withInterviewKickoff } from "@/tutor/interview-prompt.ts";
import { tutorModel } from "@/tutor/model.ts";
import { buildTutorInstructions } from "@/tutor/system-prompt.ts";
import { COPY } from "@/ui/copy.ts";

// How long creating a project waits for the question before it uses the
// fixed one.
const OPENING_TIMEOUT_MS = 30_000;

// The fixed question, once the failure that called for it is logged.
function fallbackOpening(failure: unknown): string {
  toAppError(failure, "interview opening");
  return COPY.interview.fallbackOpening;
}

// Claude's opening question for the chat, or the fixed one. The question is
// awaited whole rather than streamed, because the chat page shows it once
// the project exists.
async function openingText(chat: ChatWithProject): Promise<string> {
  const persona = getPersona(chat.personaId);
  try {
    // The model's own error. The awaited text either ignores it or rejects
    // with an error that only says no text came.
    let modelError: unknown;
    const result = streamText({
      model: tutorModel(),
      instructions: await buildTutorInstructions({ chat, persona }),
      messages: withInterviewKickoff([]),
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
      return fallbackOpening(modelError);
    }
    if (text.trim() === "") {
      return fallbackOpening(new Error("The interview opening has no text"));
    }
    return text.trim();
  } catch (error) {
    return fallbackOpening(error);
  }
}

// The tutor's first message in a new project's interview chat. It never
// fails: when Claude can't write the question, the failure is logged once
// and the message asks a fixed question instead.
async function writeInterviewOpening(
  chat: ChatWithProject,
): Promise<NewMessage> {
  return {
    id: MESSAGE_ID.parse(generateId()),
    role: "assistant",
    parts: [{ type: "text", text: await openingText(chat) }],
  };
}

export { writeInterviewOpening };
