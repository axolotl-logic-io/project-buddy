// The tutor's entry point: reply to a chat's new message with a streamed
// answer. It hides the model, the prompt, the tools, prompt caching and how
// the conversation is saved.
import type { LanguageModelV4 } from "@ai-sdk/provider";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  type ModelMessage,
  type SystemModelMessage,
  streamText,
  type UIMessage,
  type UIMessageChunk,
  type UIMessageStreamOnEndCallback,
  type UIMessageStreamWriter,
  type UIMessageStreamWriterWithOutcome,
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
import { logReplySteps } from "@/errors/error-log.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { getPersona, type Persona } from "@/personas/index.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";
import { tutorModel } from "@/tutor/model.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { buildTutorInstructions } from "@/tutor/system-prompt.ts";
import { TUTOR_TOOLS, tutorToolsContext } from "@/tutor/tools/index.ts";

// How many model calls one reply may make, besides the answer-now call; each
// tool round takes one.
const MAX_STEPS = 8;

// The hidden last user message of the answer-now call, which a reply gets
// when its model calls end without any text the user can see: a final empty
// call, or the step limit reached while still calling tools. It is sent to
// the model only, never shown or saved.
const ANSWER_NOW_NOTE =
  "(A note from the app, not from the user.) Your reply so far has no text the user can see. Write your whole reply to the user's last message now, from what you have found so far, and call no tools.";

// The part Anthropic's provider adds at the start of every model call. It
// holds only that call's usage, which the reply's diagnostics already count,
// so the reply is saved without it.
const CALL_START_KIND = "anthropic.message_start";

// The error's case. toAppError logs an error once, and streamText's onError
// has logged a model error already.
function errorCaseOf(error: unknown): AppErrorCase {
  return toAppError(error, "chat reply").errorCase;
}

function withoutCallStarts(reply: UIMessage): UIMessage {
  return {
    ...reply,
    parts: reply.parts.filter(
      (part) => !(part.type === "custom" && part.kind === CALL_START_KIND),
    ),
  };
}

// What every model call of one reply sends, the same for each so that they
// share the prompt cache's prefix, and whether any of them failed.
interface ReplyCalls {
  readonly chat: ChatWithProject;
  readonly model: LanguageModelV4;
  readonly instructions: SystemModelMessage[];
  failed: boolean;
}

type ModelCallsResult = ReturnType<typeof streamText<typeof TUTOR_TOOLS>>;
type ModelCallSteps = Awaited<ModelCallsResult["steps"]>;

function streamModelCalls(
  calls: ReplyCalls,
  messages: ModelMessage[],
  stepLimit: number,
): ModelCallsResult {
  const { chat, model, instructions } = calls;
  return streamText({
    model,
    instructions,
    messages,
    tools: TUTOR_TOOLS,
    ...tutorToolsContext({ chatId: chat.id, projectId: chat.projectId }),
    stopWhen: isStepCount(stepLimit),
    providerOptions: PROMPT_CACHE_BREAKPOINT,
    // Every model error, before or during the stream, arrives here once.
    onError: ({ error }: { error: unknown }): void => {
      calls.failed = true;
      toAppError(error, "chat reply");
    },
  });
}

// Writes the parts of result's model calls to the reply, without the
// stream's start part when it continues the reply, and never its finish
// part. Resolves with the calls' steps, or undefined when one failed.
async function writeModelCalls(
  calls: ReplyCalls,
  writer: UIMessageStreamWriter,
  result: ModelCallsResult,
  { continuesReply }: { continuesReply: boolean },
): Promise<ModelCallSteps | undefined> {
  await result
    .toUIMessageStream({
      sendStart: !continuesReply,
      sendFinish: false,
      onError: errorCaseOf,
    })
    .pipeTo(
      new WritableStream({
        write: (chunk: UIMessageChunk): void => {
          writer.write(chunk);
        },
      }),
    );
  if (calls.failed) {
    return undefined;
  }
  return await result.steps;
}

// Writes the whole reply and declares its outcome: the model's calls, then
// the answer-now call when they wrote no text.
async function writeReply(
  calls: ReplyCalls,
  writer: UIMessageStreamWriterWithOutcome,
  messages: ModelMessage[],
): Promise<void> {
  const reply = streamModelCalls(calls, messages, MAX_STEPS);
  const steps = await writeModelCalls(calls, writer, reply, {
    continuesReply: false,
  });
  const answerNow = steps?.every((step) => step.text === "") === true;
  let answerSteps: ModelCallSteps | undefined = [];
  if (answerNow) {
    const answer = streamModelCalls(
      calls,
      [
        ...messages,
        ...(await reply.response).messages,
        { role: "user", content: ANSWER_NOW_NOTE },
      ],
      1,
    );
    answerSteps = await writeModelCalls(calls, writer, answer, {
      continuesReply: true,
    });
  }
  if (steps === undefined || answerSteps === undefined) {
    writer.setOutcome({ status: "failed" });
    return;
  }
  const replySteps = [...steps, ...answerSteps];
  logReplySteps(replySteps, { answerNow });
  writer.write({
    type: "finish",
    finishReason: replySteps.at(-1)?.finishReason ?? "stop",
  });
  writer.setOutcome({ status: "completed" });
}

// Streams the reply to the conversation's last message as the browser's
// response, and saves it once it completes. When the model's calls end with
// no text and no error, one more call, the answer-now call, asks for the
// reply, and its parts join the same reply. The response tees off a copy
// that after() reads to the end, so a disconnect stops only the browser's
// copy and the reply is still saved.
async function streamAndSaveReply(
  chat: ChatWithProject,
  persona: Persona,
  history: UIMessage[],
  answered: UIMessage,
): Promise<Response> {
  const calls: ReplyCalls = {
    chat,
    model: tutorModel(),
    instructions: await buildTutorInstructions({ chat, persona }),
    failed: false,
  };
  const messages = await convertToModelMessages(history, {
    tools: TUTOR_TOOLS,
  });
  const stream = createUIMessageStream({
    originalMessages: history,
    // The stream reports each error chunk's text back here as a new Error,
    // which isn't a failure to log: execute catches every failure itself.
    onError: (): string => "",
    execute: async ({
      writer,
    }: {
      writer: UIMessageStreamWriterWithOutcome;
    }): Promise<void> => {
      try {
        await writeReply(calls, writer, messages);
      } catch (error) {
        writer.write({ type: "error", errorText: errorCaseOf(error) });
        writer.setOutcome({ status: "failed", error });
      }
    },
    onEnd: async ({
      responseMessage,
      outcome,
    }: Parameters<
      UIMessageStreamOnEndCallback<UIMessage>
    >[0]): Promise<void> => {
      // The browser's copy of the reply shares this stream, so a failed save
      // is logged here rather than failing the stream.
      try {
        if (outcome.status === "completed") {
          await saveReply(
            chat.id,
            withoutCallStarts(responseMessage),
            answered.id,
          );
        }
      } catch (error) {
        toAppError(error, "save chat reply");
      }
    },
  });
  return createUIMessageStreamResponse({
    stream,
    consumeSseStream: ({ stream: saved }: { stream: ReadableStream }): void => {
      after(
        consumeStream({
          stream: saved,
          onError: (error: unknown): void => {
            toAppError(error, "save chat reply");
          },
        }),
      );
    },
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
