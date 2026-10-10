import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { getChat, listMessages, saveMessage } from "@/chats/store";
import { getPersona } from "@/personas";
import { tutorModel } from "@/tutor/model";
import { buildTutorSystemPrompt } from "@/tutor/system-prompt";

// ChatView sends only the new message; the history comes from the database.
type ChatRequestBody = { id: string; message: UIMessage };

export async function POST(request: Request) {
  const { id, message }: ChatRequestBody = await request.json();

  const chat = await getChat(id);
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }
  const persona = getPersona(chat.personaId);
  if (!persona) {
    throw new Error(`Chat ${chat.id} has unknown persona "${chat.personaId}"`);
  }

  const history = [...(await listMessages(chat.id)), message];
  await saveMessage(chat.id, message);

  // The search-tool task adds its tools to this call.
  const result = streamText({
    model: tutorModel(),
    system: buildTutorSystemPrompt({ projectName: chat.projectName, persona }),
    messages: await convertToModelMessages(history),
  });

  // Finish the reply and save it even if the browser disconnects.
  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: history,
      generateMessageId: generateId,
      onEnd: async ({ responseMessage, outcome }) => {
        if (outcome.status === "completed") {
          await saveMessage(chat.id, responseMessage);
        }
      },
    }),
  });
}
