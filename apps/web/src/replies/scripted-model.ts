// A local script transported through the SDK protocol; no network requests.
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
  LanguageModelV4Usage,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { isAnswerNowNote } from "@/replies/answer-now.ts";
import { isAuthorHeader } from "@/replies/author-names.ts";
import type {
  ReplyScript,
  ScriptConversation,
  ScriptStep,
  ScriptToolCall,
  ScriptToolResult,
} from "@/replies/reply-script.ts";

// Streams text a word at a time, through the existing stream protocol.
const WORD_BOUNDARY = /(?<= )/u;

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
): ScriptToolResult {
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

// The user's last message as plain text, without the author's header it
// starts with in a chat with several authors (author-names.ts), what came
// before it, the header, the tool results that follow it, and whether the
// app's answer-now note follows them.
function readPrompt(prompt: LanguageModelV4Prompt): {
  userText: string;
  conversation: ScriptConversation;
} {
  const lastUser = prompt.findLastIndex(
    (message) => message.role === "user" && !isAnswerNowNote(message),
  );
  const userMessage = prompt[lastUser];
  let texts: string[] = [];
  if (userMessage !== undefined) {
    texts = textsOf(userMessage);
  }
  const [first, ...rest] = texts;
  if (first !== undefined && isAuthorHeader(first)) {
    texts = rest;
  }
  const userText = texts.join("\n");
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
      systemTexts: prompt.flatMap((message) => {
        if (message.role === "system") {
          return [message.content];
        }
        return [];
      }),
      toolResults,
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
  toolCalls: readonly ScriptToolCall[],
  index: number,
): (LanguageModelV4StreamPart & LanguageModelV4Content)[] {
  return toolCalls.map((call, callIndex) => ({
    type: "tool-call",
    toolCallId: `local-call-${index}-${callIndex}`,
    toolName: call.toolName,
    input: JSON.stringify(call.input),
  }));
}

function finishReasonOf(
  toolCalls: readonly ScriptToolCall[],
): LanguageModelV4FinishReason {
  if (toolCalls.length > 0) {
    return { unified: "tool-calls", raw: undefined };
  }
  return { unified: "stop", raw: undefined };
}

// After the text, a step's tool calls or its error, then how it finished.
function endChunks(
  step: ScriptStep,
  index: number,
  usage: LanguageModelV4Usage,
): LanguageModelV4StreamPart[] {
  return [
    ...toolCallsOf(step.toolCalls, index),
    {
      type: "finish",
      usage,
      finishReason: finishReasonOf(step.toolCalls),
    },
  ];
}

function stepChunks(
  step: ScriptStep,
  index: number,
  usage: LanguageModelV4Usage,
): LanguageModelV4StreamPart[] {
  return [
    { type: "stream-start", warnings: [] },
    ...textChunks(step.text, `text-${index}`),
    ...endChunks(step, index, usage),
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

// The script's step for this call, and its number.
function scriptedStep(
  script: ReplyScript,
  prompt: LanguageModelV4Prompt,
): { step: ScriptStep; index: number } {
  const { userText, conversation } = readPrompt(prompt);
  const index = stepNumber(prompt);
  const step = script(userText, conversation)[index] ?? {
    text: "",
    toolCalls: [],
  };
  return { step, index };
}

function streamStep(
  script: ReplyScript,
  { prompt }: LanguageModelV4CallOptions,
  usage: LanguageModelV4Usage,
): LanguageModelV4StreamResult {
  const { step, index } = scriptedStep(script, prompt);
  return {
    stream: simulateReadableStream({
      chunks: stepChunks(step, index, usage),
      initialDelayInMs: null,
      chunkDelayInMs: null,
    }),
  };
}

// The step all at once. A step with an error fails the call with it, as a
// provider's failed request does, and its text is lost with the response.
function generateStep(
  script: ReplyScript,
  { prompt }: LanguageModelV4CallOptions,
  usage: LanguageModelV4Usage,
): Promise<LanguageModelV4GenerateResult> {
  const { step, index } = scriptedStep(script, prompt);
  const text: LanguageModelV4Content[] = [];
  if (step.text !== "") {
    text.push({ type: "text", text: step.text });
  }
  return Promise.resolve({
    content: [...text, ...toolCallsOf(step.toolCalls, index)],
    finishReason: finishReasonOf(step.toolCalls),
    usage,
    warnings: [],
  });
}

// Adapts local rules to the existing streaming and tool-execution harness.
function scriptedModel(
  script: ReplyScript,
  identity: {
    readonly provider: string;
    readonly modelId: string;
    readonly usage: LanguageModelV4Usage;
  },
): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: identity.provider,
    modelId: identity.modelId,
    supportedUrls: {},
    doGenerate: (
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4GenerateResult> =>
      generateStep(script, options, identity.usage),
    doStream: (
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4StreamResult> =>
      Promise.resolve(streamStep(script, options, identity.usage)),
  };
}

export { scriptedModel };
