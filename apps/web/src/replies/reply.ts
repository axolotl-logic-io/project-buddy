// The construct's entry point: reply to a chat's new message with a streamed
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
  type UIMessage,
  type UIMessageChunk,
  type UIMessageStreamOnEndCallback,
  type UIMessageStreamWriter,
  type UIMessageStreamWriterWithOutcome,
} from "ai";
import { after } from "next/server";
import type { Chat } from "@/chats/chat-rows.ts";
import type { ChatMessage } from "@/chats/message-author.ts";
import { getChat } from "@/chats/store.ts";
import type { ConstructSnapshot } from "@/constructs/index.ts";
import {
  AppError,
  type AppErrorCase,
  appErrorResponse,
} from "@/errors/app-error.ts";
import { logReplySteps } from "@/errors/error-log.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { MessageId, UserId } from "@/ids.ts";
import { hydrateImages } from "@/images/store.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import {
  ANSWER_NOW_NOTE,
  calledCiteManual,
  endsWithoutText,
  withAnswerNowNote,
} from "@/replies/answer-now.ts";
import { withAuthorNames } from "@/replies/author-names.ts";
import type { ChatRequest } from "@/replies/chat-protocol.ts";
import { conversationToAnswer } from "@/replies/conversation-to-answer.ts";
import { replyModel } from "@/replies/model.ts";
import { planPartForModel } from "@/replies/plan-message-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/replies/prompt-cache.ts";
import {
  completeReplyAccounting,
  replyUsageRecorder,
} from "@/replies/reply-accounting.ts";
import { endReply, releaseClaim } from "@/replies/reply-end.ts";
import {
  beginReplyRun,
  cancellationRequested,
  finishReplyRun,
  watchReplyCancellation,
} from "@/replies/reply-runs.ts";
import { buildReplyInstructions } from "@/replies/system-prompt.ts";
import {
  type ChatToolCalls,
  type ChatToolStep,
  chatTools,
  streamChatToolCalls,
} from "@/replies/tools/index.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// How many model calls one reply may make, besides the answer-now call; each
// tool round takes one.
const MAX_STEPS = 8;

// The error's case. toAppError logs an error once, and streamText's onError
// has logged a model error already.
function errorCaseOf(error: unknown): AppErrorCase {
  return toAppError(error, "chat reply").errorCase;
}

// The chat a reply is in, and its acting user, whose data alone the reply reads
// and writes.
interface AccessibleChat {
  readonly actingUser: UserId;
  readonly chat: Chat;
}

// What every model call of one reply sends, the same for each so that they
// share the prompt cache's prefix, and whether any of them failed.
interface ReplyCalls extends AccessibleChat {
  // The user message the reply answers.
  readonly answeredId: MessageId;
  readonly model: LanguageModelV4;
  readonly instructions: SystemModelMessage[];
  failed: boolean;
  readonly cancellation: ReturnType<typeof watchReplyCancellation>;
}

type ModelCallSteps = ChatToolStep[];

function streamModelCalls(
  calls: ReplyCalls,
  messages: ModelMessage[],
  stepLimit: number,
): ChatToolCalls {
  const { model, instructions } = calls;
  return streamChatToolCalls(calls, {
    model,
    instructions,
    abortSignal: calls.cancellation.signal,
    prepareStep: async (): Promise<undefined> => {
      await calls.cancellation.check();
      return undefined;
    },
    onToolExecutionStart: calls.cancellation.check,
    messages,
    stopWhen: isStepCount(stepLimit),
    providerOptions: PROMPT_CACHE_BREAKPOINT,
    // Every model error, before or during the stream, arrives here once.
    onError: ({ error }: { error: unknown }): void => {
      if (calls.cancellation.signal.aborted) {
        return;
      }
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
  result: ChatToolCalls,
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
  if (calls.cancellation.signal.aborted) {
    writer.setOutcome({ status: "aborted" });
    return;
  }
  const answerNow = steps !== undefined && endsWithoutText(steps);
  let answerSteps: ModelCallSteps | undefined = [];
  if (answerNow) {
    const answer = streamModelCalls(
      calls,
      withAnswerNowNote(
        [...messages, ...(await reply.responseMessages)],
        ANSWER_NOW_NOTE,
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
// response, and saves it once it completes, or releases the message's
// claim if it doesn't (reply-end.ts). In a chat with several authors, the
// model reads each user message with its author's name (author-names.ts). When the model's calls end
// without an answer (`answer-now.ts` decides) and with no error, one more
// call, the answer-now call, asks for the reply, and its parts join the same
// reply.
// The response tees off a copy that after() reads to the end, so a
// disconnect stops only the browser's copy and the reply is still saved.
// The response ends once the reply is saved. Every model call of the
// reply, the answer-now call included, is made from grant, the one gold check the
// message passed.
async function streamAndSaveReply(
  { actingUser, chat, grant }: AccessibleChat & { readonly grant: QuotaGrant },
  construct: ConstructSnapshot,
  history: ChatMessage[],
  answered: ChatRequest["message"],
): Promise<Response> {
  const runId = await beginReplyRun(actingUser, chat.id, answered.id);
  const cancellation = watchReplyCancellation(actingUser, runId);
  const accountedGrant: QuotaGrant = {
    ...grant,
    usage: replyUsageRecorder(actingUser, runId),
  };
  function accountingFinished(): Promise<void> {
    return completeReplyAccounting(actingUser, runId).catch(
      (error: unknown): void => {
        toAppError(error, "finish reply accounting");
      },
    );
  }
  try {
    const named = withAuthorNames(history);
    const calls: ReplyCalls = {
      actingUser,
      chat,
      cancellation,
      answeredId: answered.id,
      model: replyModel(accountedGrant),
      instructions: await buildReplyInstructions({
        actingUser,
        chat,
        construct,
        severalAuthors: named.severalAuthors,
      }),
      failed: false,
    };
    const messages = await convertToModelMessages(
      await hydrateImages(actingUser, chat.id, named.messages),
      {
        tools: chatTools(chat.quest?.id),
        convertDataPart: planPartForModel,
      },
    );
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
          if (cancellation.signal.aborted) {
            writer.setOutcome({ status: "aborted" });
            return;
          }
          writer.write({ type: "error", errorText: errorCaseOf(error) });
          writer.setOutcome({ status: "failed", error });
        }
      },
      onEnd: async (
        ended: Parameters<UIMessageStreamOnEndCallback<UIMessage>>[0],
      ): Promise<void> => {
        try {
          const cancelled =
            ended.outcome.status !== "completed" &&
            (await cancellationRequested(actingUser, runId));
          if (cancelled) {
            const partial: UIMessage = {
              ...ended.responseMessage,
              parts: ended.responseMessage.parts.filter((part) => {
                if (part.type === "text") {
                  return true;
                }
                return (
                  "state" in part &&
                  (part.state === "output-available" ||
                    part.state === "output-error")
                );
              }),
            };
            partial.parts.push({
              type: "text",
              text: CHAT_COPY.cancelledReply,
            });
            await endReply(
              {
                actingUser,
                chat,
                accountingFinished,
                answeredId: answered.id,
                cancelled: true,
              },
              {
                ...ended,
                responseMessage: partial,
                outcome: { status: "completed" },
              },
            );
            await releaseClaim(actingUser, chat, answered.id);
            await finishReplyRun(actingUser, runId, "cancelled");
          } else {
            const saved = await endReply(
              {
                actingUser,
                chat,
                accountingFinished,
                answeredId: answered.id,
              },
              ended,
            );
            let status: "completed" | "failed" = "failed";
            if (ended.outcome.status === "completed" && saved) {
              status = "completed";
            }
            await finishReplyRun(actingUser, runId, status);
          }
        } catch (error) {
          await releaseClaim(actingUser, chat, answered.id);
          await accountingFinished();
          await finishReplyRun(actingUser, runId, "failed");
          throw error;
        } finally {
          cancellation.close();
        }
      },
    });
    return createUIMessageStreamResponse({
      stream,
      consumeSseStream: ({
        stream: saved,
      }: {
        stream: ReadableStream;
      }): void => {
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
  } catch (error) {
    cancellation.close();
    await accountingFinished();
    await finishReplyRun(actingUser, runId, "failed");
    throw error;
  }
}

// Saves the user's message in the acting user's chat, streams the construct's reply
// and saves the reply once it completes, even if the browser disconnects
// first. An unknown chat, or another user's, answers 404 with the not-found
// case, unlogged; a message answered already, 409 with the already-answered
// case; a new message once the acting user is out of gold, 429 with the
// out-of-gold case (conversation-to-answer.ts). Any other failure is logged once and reaches the browser as its
// case, in the response before the reply streams and in the stream after; a
// failed reply is not saved, and releases its message's claim so the
// browser can send it again.
async function replyToChat(
  actingUser: UserId,
  { chatId, message }: ChatRequest,
): Promise<Response> {
  // The chat whose message this request claimed, until the reply's stream
  // takes over releasing the claim.
  let claimedIn: Chat | undefined;
  try {
    const chat = await getChat(actingUser, chatId);
    if (chat === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    await hydrateImages(actingUser, chat.id, [message]);
    const { construct } = chat;
    const answer = await conversationToAnswer(actingUser, chat, message);
    if (answer.kind === "refused") {
      return answer.response;
    }
    claimedIn = chat;
    return await streamAndSaveReply(
      { actingUser, chat, grant: answer.grant },
      construct,
      answer.conversation,
      message,
    );
  } catch (error) {
    if (claimedIn !== undefined) {
      await releaseClaim(actingUser, claimedIn, message.id);
    }
    if (error instanceof AppError && error.errorCase === "invalid-image") {
      return appErrorResponse("invalid-image", HTTP_STATUS.badRequest);
    }
    const { errorCase } = toAppError(error, "reply to chat");
    return appErrorResponse(errorCase, HTTP_STATUS.internalServerError);
  }
}

export { replyToChat };
