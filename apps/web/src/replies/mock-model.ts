// A deterministic stand-in for Claude that the AI SDK runs like any model.
// BUDDY_MODEL=mock selects it, so tests never call Anthropic. It keeps no
// state between calls: each call plays the script step that matches the
// number of tool results since the user's last message, streamed or, for
// generateText, all at once.
//
// In the answer-now call (answer-now.ts), the script is asked again for the
// user's message before the app's note, with answerNow set, and plays its
// first step.
//
// By default it plays defaultMockScript (mock-script.ts), which answers the
// user's last message: each `/mock-…` command in MOCK_COMMANDS there, with
// its usage beside it, and a Markdown reply quoting any other message. A
// test may pass its own MockScript instead.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4FinishReason,
  LanguageModelV4GenerateResult,
  LanguageModelV4Message,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
  LanguageModelV4ToolResultOutput,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { isAnswerNowNote } from "@/replies/answer-now.ts";
import {
  defaultMockScript,
  type MockConversation,
  type MockScript,
  type MockStep,
  type MockToolCall,
  type MockToolResult,
} from "@/replies/mock-script.ts";

// Streams text a word at a time, as Claude streams it in pieces.
const WORD_BOUNDARY = /(?<= )/u;

const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
} as const;

function textsOf(message: LanguageModelV4Message): string[] {
  if (message.role === "system") {
    return [message.content];
  }
  if (message.role === "tool") {
    return [];
  }
  return message.content.flatMap((part) => {
    if (part.type === "text") {
      return [part.text];
    }
    return [];
  });
}

function toolResultOf(
  toolName: string,
  output: LanguageModelV4ToolResultOutput,
): MockToolResult {
  switch (output.type) {
    case "json":
    case "text":
      return { toolName, failed: false, output: output.value };
    case "error-json":
    case "error-text":
      return { toolName, failed: true, output: output.value };
    case "execution-denied":
    case "content":
      return { toolName, failed: true, output: undefined };
    default: {
      const unhandled: never = output;
      return unhandled;
    }
  }
}

// The user's last message as plain text, what came before it, the tool
// results that follow it, and whether the app's answer-now note follows them.
function readPrompt(prompt: LanguageModelV4Prompt): {
  userText: string;
  conversation: MockConversation;
} {
  const lastUser = prompt.findLastIndex(
    (message) => message.role === "user" && !isAnswerNowNote(message),
  );
  const userMessage = prompt[lastUser];
  let userText = "";
  if (userMessage !== undefined) {
    userText = textsOf(userMessage).join("\n");
  }
  const toolResults = prompt.slice(lastUser + 1).flatMap((message) => {
    if (message.role !== "tool") {
      return [];
    }
    return message.content.flatMap((part) => {
      if (part.type === "tool-result") {
        return [toolResultOf(part.toolName, part.output)];
      }
      return [];
    });
  });
  return {
    userText,
    conversation: {
      images: prompt.flatMap((message) => {
        if (message.role !== "user") {
          return [];
        }
        return message.content.flatMap((part) => {
          if (
            part.type !== "file" ||
            part.data.type !== "data" ||
            !part.mediaType.startsWith("image/")
          ) {
            return [];
          }
          const bytes = part.data.data;
          if (typeof bytes === "string") {
            return [
              {
                mediaType: part.mediaType,
                bytes: [...Buffer.from(bytes, "base64")],
              },
            ];
          }
          return [{ mediaType: part.mediaType, bytes: [...bytes] }];
        });
      }),
      systemTexts: prompt.flatMap((message) => {
        if (message.role === "system") {
          return [message.content];
        }
        return [];
      }),
      earlierTexts: prompt
        .slice(0, Math.max(lastUser, 0))
        .filter((message) => message.role !== "system")
        .flatMap(textsOf),
      toolResults,
      answerNow: prompt.slice(lastUser + 1).some(isAnswerNowNote),
    },
  };
}

function textChunks(text: string, textId: string): LanguageModelV4StreamPart[] {
  if (text === "") {
    return [];
  }
  return [
    { type: "text-start", id: textId },
    ...text.split(WORD_BOUNDARY).map(
      (delta): LanguageModelV4StreamPart => ({
        type: "text-delta",
        id: textId,
        delta,
      }),
    ),
    { type: "text-end", id: textId },
  ];
}

// The step's tool calls, with ids unique within the reply.
function toolCallsOf(
  toolCalls: readonly MockToolCall[],
  index: number,
): (LanguageModelV4StreamPart & LanguageModelV4Content)[] {
  return toolCalls.map((call, callIndex) => ({
    type: "tool-call",
    toolCallId: `mock-call-${index}-${callIndex}`,
    toolName: call.toolName,
    input: JSON.stringify(call.input),
  }));
}

function finishReasonOf(
  toolCalls: readonly MockToolCall[],
): LanguageModelV4FinishReason {
  if (toolCalls.length > 0) {
    return { unified: "tool-calls", raw: undefined };
  }
  return { unified: "stop", raw: undefined };
}

// After the text, a step's tool calls or its error, then how it finished.
function endChunks(step: MockStep, index: number): LanguageModelV4StreamPart[] {
  if ("error" in step) {
    return [
      { type: "error", error: step.error },
      {
        type: "finish",
        usage: MOCK_USAGE,
        finishReason: { unified: "error", raw: undefined },
      },
    ];
  }
  return [
    ...toolCallsOf(step.toolCalls, index),
    {
      type: "finish",
      usage: MOCK_USAGE,
      finishReason: finishReasonOf(step.toolCalls),
    },
  ];
}

function stepChunks(
  step: MockStep,
  index: number,
): LanguageModelV4StreamPart[] {
  return [
    { type: "stream-start", warnings: [] },
    ...textChunks(step.text, `text-${index}`),
    ...endChunks(step, index),
  ];
}

// The number of the step a call plays: one step per tool message since the
// last user message, so the answer-now call, which follows its note, plays
// the first.
function stepNumber(prompt: LanguageModelV4Prompt): number {
  const lastUser = prompt.findLastIndex((message) => message.role === "user");
  return prompt.slice(lastUser + 1).filter((message) => message.role === "tool")
    .length;
}

// How long the model waits before it streams step, or null for no wait.
function startDelay(step: MockStep): number | null {
  if ("delayMs" in step) {
    return step.delayMs ?? null;
  }
  return null;
}

// The script's step for this call, and its number.
function scriptedStep(
  script: MockScript,
  prompt: LanguageModelV4Prompt,
): { step: MockStep; index: number } {
  const { userText, conversation } = readPrompt(prompt);
  const index = stepNumber(prompt);
  const step = script(userText, conversation)[index] ?? {
    text: "",
    toolCalls: [],
  };
  return { step, index };
}

function streamStep(
  script: MockScript,
  { prompt }: LanguageModelV4CallOptions,
): LanguageModelV4StreamResult {
  const { step, index } = scriptedStep(script, prompt);
  return {
    stream: simulateReadableStream({
      chunks: stepChunks(step, index),
      initialDelayInMs: startDelay(step),
      chunkDelayInMs: null,
    }),
  };
}

// The step all at once. A step with an error fails the call with it, as a
// provider's failed request does, and its text is lost with the response.
function generateStep(
  script: MockScript,
  { prompt }: LanguageModelV4CallOptions,
): Promise<LanguageModelV4GenerateResult> {
  const { step, index } = scriptedStep(script, prompt);
  if ("error" in step) {
    return Promise.reject(step.error);
  }
  const text: LanguageModelV4Content[] = [];
  if (step.text !== "") {
    text.push({ type: "text", text: step.text });
  }
  return Promise.resolve({
    content: [...text, ...toolCallsOf(step.toolCalls, index)],
    finishReason: finishReasonOf(step.toolCalls),
    usage: MOCK_USAGE,
    warnings: [],
  });
}

// The mock model, playing `script`, by default the commands described at the
// top of this file.
function mockBuddyModel(
  script: MockScript = defaultMockScript,
): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "mock",
    modelId: "buddy-mock",
    supportedUrls: {},
    doGenerate: (
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4GenerateResult> => generateStep(script, options),
    doStream: (
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4StreamResult> =>
      Promise.resolve(streamStep(script, options)),
  };
}

export { mockBuddyModel };
