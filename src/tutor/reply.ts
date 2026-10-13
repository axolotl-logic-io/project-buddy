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
import type { ChatWithProject } from "@/chats/chat-rows.ts";
import { getChat, saveReply } from "@/chats/store.ts";
import { type AppErrorCase, appErrorResponse } from "@/errors/app-error.ts";
import { logReplySteps } from "@/errors/error-log.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { UserId } from "@/ids.ts";
import type { PersonaSnapshot } from "@/personas/index.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import {
  calledCiteManual,
  endsWithoutText,
  withAnswerNowNote,
} from "@/tutor/answer-now.ts";
import { nameChatIfDue } from "@/tutor/chat-naming.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";
import { conversationToAnswer } from "@/tutor/conversation-to-answer.ts";
import { tutorModel } from "@/tutor/model.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { withoutProviderBookkeeping } from "@/tutor/provider-bookkeeping.ts";
import { buildTutorInstructions } from "@/tutor/system-prompt.ts";
import {
  type TutorTools,
  tutorTools,
  tutorToolsContext,
} from "@/tutor/tools/index.ts";

// How many model calls one reply may make, besides the answer-now call; each
// tool round takes one.
const MAX_STEPS = 8;

// The error's case. toAppError logs an error once, and streamText's onError
// has logged a model error already.
function errorCaseOf(error: unknown): AppErrorCase {
  return toAppError(error, "chat reply").errorCase;
}

// The chat a reply is in, and its owner, whose data alone the reply reads
// and writes.
interface OwnedChat {
  readonly owner: UserId;
  readonly chat: ChatWithProject;
}

// What every model call of one reply sends, the same for each so that they
// share the prompt cache's prefix, and whether any of them failed.
interface ReplyCalls extends OwnedChat {
  readonly model: LanguageModelV4;
  readonly instructions: SystemModelMessage[];
  readonly tools: TutorTools;
  readonly answerNowNote: string;
  failed: boolean;
}

type ModelCallsResult = ReturnType<typeof streamText<TutorTools>>;
type ModelCallSteps = Awaited<ModelCallsResult["steps"]>;

function streamModelCalls(
  calls: ReplyCalls,
  messages: ModelMessage[],
  stepLimit: number,
): ModelCallsResult {
  const { owner, chat, model, instructions, tools } = calls;
  return streamText({
    model,
    instructions,
    messages,
    tools,
    ...tutorToolsContext({ owner, chatId: chat.id, projectId: chat.projectId }),
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
// the answer-now call when they end without text.
async function writeReply(
  calls: ReplyCalls,
  writer: UIMessageStreamWriterWithOutcome,
  messages: ModelMessage[],
): Promise<void> {
  const reply = streamModelCalls(calls, messages, MAX_STEPS);
  const steps = await writeModelCalls(calls, writer, reply, {
    continuesReply: false,
  });
  const answerNow = steps !== undefined && endsWithoutText(steps);
  let answerSteps: ModelCallSteps | undefined = [];
  if (answerNow) {
    const answer = streamModelCalls(
      calls,
      withAnswerNowNote(
        [...messages, ...(await reply.responseMessages)],
        calls.answerNowNote,
      ),
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
  // The limit, not the model, ended the calls: the last one still used tools.
  const stoppedAtStepLimit =
    steps.length >= MAX_STEPS && steps.at(-1)?.finishReason === "tool-calls";
  logReplySteps(replySteps, {
    answerNow,
    stoppedAtStepLimit,
    calledCiteManual: calledCiteManual(replySteps),
  });
  writer.write({
    type: "finish",
    finishReason: replySteps.at(-1)?.finishReason ?? "stop",
  });
  writer.setOutcome({ status: "completed" });
}

// Streams the reply to the conversation's last message as the browser's
// response, and saves it once it completes. When the model's calls end
// without an answer (`answer-now.ts` decides) and with no error, one more
// call, the answer-now call, asks for the reply, and its parts join the same
// reply.
// The response tees off a copy that after() reads to the end, so a
// disconnect stops only the browser's copy and the reply is still saved.
// The response ends once the reply is saved: naming the chat runs later, in
// its own after() task. Every model call of the reply, the answer-now call
// and the naming included, is made from grant, the one quota check the
// message passed.
async function streamAndSaveReply(
  { owner, chat, grant }: OwnedChat & { readonly grant: QuotaGrant },
  persona: PersonaSnapshot,
  history: UIMessage[],
  answered: ChatRequest["message"],
): Promise<Response> {
  const calls: ReplyCalls = {
    owner,
    chat,
    model: tutorModel(grant, persona.parts.neutralKickoff),
    instructions: await buildTutorInstructions({ owner, chat, persona }),
    tools: tutorTools(persona.parts),
    answerNowNote: persona.parts.answerNow,
    failed: false,
  };
  const messages = await convertToModelMessages(history, {
    tools: calls.tools,
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
      // is logged here rather than failing the stream. The stream stays open
      // until this resolves, so naming, which never rejects, isn't awaited.
      try {
        if (outcome.status === "completed") {
          await saveReply(
            owner,
            chat.id,
            withoutProviderBookkeeping(responseMessage),
            answered.id,
          );
          after(() => nameChatIfDue(grant, chat.id, answered.id));
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

// Saves the user's message in the owner's chat, streams the tutor's reply
// and saves the reply once it completes, even if the browser disconnects
// first. An unknown chat, or another user's, answers 404 with the not-found
// case, unlogged; a message answered already, 409 with the already-answered
// case; a new message once the owner's monthly quota is used up, 429 with the
// quota-used-up case (conversation-to-answer.ts). Any other failure is logged once and reaches the browser as its
// case, in the response before the reply streams and in the stream after; a
// failed reply is not saved.
async function replyToChat(
  owner: UserId,
  { chatId, message }: ChatRequest,
): Promise<Response> {
  try {
    const chat = await getChat(owner, chatId);
    if (chat === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    const { persona } = chat;
    const answer = await conversationToAnswer(owner, chat, message);
    if (answer.kind === "refused") {
      return answer.response;
    }
    return await streamAndSaveReply(
      { owner, chat, grant: answer.grant },
      persona,
      answer.conversation,
      message,
    );
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "reply to chat").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}

export { replyToChat };
