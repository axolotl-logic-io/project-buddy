import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import { classifyError, toAppError } from "@/errors/app-error.ts";
import { getPersona } from "@/personas/index.ts";
import { tutorModel } from "@/tutor/model.ts";
import { buildTutorSystemPrompt } from "@/tutor/system-prompt.ts";

// ChatView sends only the new message; the history comes from the database.
type ChatRequestBody = { id: string; message: UIMessage };

// Failures reach ChatView as their AppErrorCase alone, in the response body
// before streaming starts and as the stream's error text after.
export async function POST(request: Request) {
  const { id, message }: ChatRequestBody = await request.json();

  try {
    const chat = await getChat(id);
    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }
    const persona = getPersona(chat.personaId);
    if (!persona) {
      throw new Error(
        `Chat ${chat.id} has unknown persona "${chat.personaId}"`,
      );
    }

    const history = [...(await listMessages(chat.id)), message];
    await saveMessage(chat.id, message);

    // The search-tool task adds its tools to this call.
    const result = streamText({
      model: tutorModel(),
      system: buildTutorSystemPrompt({
        projectName: chat.projectName,
        persona,
      }),
      messages: await convertToModelMessages(history),
      // Every model error, before or during the stream, arrives here once.
      onError: ({ error }) => {
        toAppError(error, "chat reply");
      },
    });

    // Finish the reply and save it even if the browser disconnects.
    result.consumeStream();

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: history,
        generateMessageId: generateId,
        // streamText's onError has logged the error already.
        onError: classifyError,
        onEnd: async ({ responseMessage, outcome }) => {
          if (outcome.status === "completed") {
            await saveMessage(chat.id, responseMessage);
          }
        },
      }),
    });
  } catch (error) {
    return new Response(toAppError(error, "POST /api/chat").errorCase, {
      status: 500,
    });
  }
}
