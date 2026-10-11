// The tutor's entry point: reply to a chat's new message with a streamed
// answer. It hides the model, the prompt, the tools, prompt caching and how
// the conversation is saved.
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
  type UIMessageStreamOnEndCallback,
} from "ai";
import { after } from "next/server";
import {
  type ChatWithProject,
  getChat,
  listMessages,
  saveMessage,
  saveReply,
} from "@/chats/store.ts";
import { type AppErrorCase, appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { getPersona, type Persona } from "@/personas/index.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";
import { tutorModel } from "@/tutor/model.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { buildTutorInstructions } from "@/tutor/system-prompt.ts";
import { TUTOR_TOOLS, tutorToolsContext } from "@/tutor/tools/index.ts";

// How many model calls one reply may make; each tool round takes one.
const MAX_STEPS = 8;

// Streams the reply to the conversation's last message as the browser's
// response, and saves it once it completes. The browser and the save read
// separate copies of the model's stream and give the reply the same id, so a
// disconnect stops only the browser's copy, and after() keeps the save
// running once the response ends.
async function streamAndSaveReply(
  chat: ChatWithProject,
  persona: Persona,
  history: UIMessage[],
  answered: UIMessage,
): Promise<Response> {
  const result = streamText({
    model: tutorModel(),
    instructions: await buildTutorInstructions({ chat, persona }),
    messages: await convertToModelMessages(history, { tools: TUTOR_TOOLS }),
    tools: TUTOR_TOOLS,
    ...tutorToolsContext({ chatId: chat.id, projectId: chat.projectId }),
    stopWhen: isStepCount(MAX_STEPS),
    providerOptions: PROMPT_CACHE_BREAKPOINT,
    // Every model error, before or during the stream, arrives here once.
    onError: ({ error }: { error: unknown }): void => {
      toAppError(error, "chat reply");
    },
  });
  const replyId = generateId();
  const uiStreamOptions = {
    originalMessages: history,
    generateMessageId: (): string => replyId,
    // The error's case. toAppError logs an error once, and streamText's
    // onError has logged this one already.
    onError: (error: unknown): AppErrorCase =>
      toAppError(error, "chat reply").errorCase,
  };
  const saved = toUIMessageStream({
    ...uiStreamOptions,
    stream: result.stream,
    // Only the browser's copy shows an error. This copy also reports its own
    // error text back as a new Error, which isn't a failure to log.
    onError: (): string => "",
    onEnd: async ({
      responseMessage,
      outcome,
    }: Parameters<
      UIMessageStreamOnEndCallback<UIMessage>
    >[0]): Promise<void> => {
      if (outcome.status === "completed") {
        await saveReply(chat.id, responseMessage, answered.id);
      }
    },
  });
  after(
    consumeStream({
      stream: saved,
      onError: (error: unknown): void => {
        toAppError(error, "save chat reply");
      },
    }),
  );
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ ...uiStreamOptions, stream: result.stream }),
  });
}

// Saves the user's message, streams the tutor's reply and saves the reply
// once it completes, even if the browser disconnects first. An unknown chat
// answers 404 with the not-found case, unlogged. Any other failure is logged
// once and reaches the browser as its case, in the response before the reply
// streams and in the stream after; a failed reply is not saved.
async function replyToChat({
  chatId,
  message,
}: ChatRequest): Promise<Response> {
  try {
    const chat = await getChat(chatId);
    if (chat === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    const persona = getPersona(chat.personaId);
    if (persona === undefined) {
      throw new Error(
        `Chat ${chat.id} has unknown persona "${chat.personaId}"`,
      );
    }

    const history = [...(await listMessages(chat.id)), message];
    await saveMessage(chat.id, message);
    return await streamAndSaveReply(chat, persona, history, message);
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "reply to chat").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}

export { replyToChat };
