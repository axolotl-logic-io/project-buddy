// A deterministic stand-in for Claude that the AI SDK runs like any model.
// TUTOR_MODEL=mock selects it, so tests never call Anthropic. It keeps no
// state between calls: each call plays the script step that matches the
// number of tool results since the user's last message.
//
// By default it plays defaultMockScript (mock-script.ts), which answers the
// user's last message:
// - `/mock-tool <tool name> <JSON object>` calls that tool with that input,
//   then says "The mock tutor called `<tool name>`.". Input that is not a
//   JSON object gets a text reply saying so, and no call.
// - `/mock-search <query>` calls search_manual with the query, then replies
//   with each section found, its title in bold and its excerpt, and cites
//   them all with cite_manual. When nothing is found it says the manual has
//   nothing on the query and cites nothing.
// - `/mock-recall <word>` replies with every line of the system prompt and
//   the earlier messages that contains the word, ignoring case, so a test
//   can see what the tutor was told.
// - `/mock-markdown` replies with a heading, emphasis, both kinds of list, a
//   table, a manual link and a Python block.
// - Any other `/mock-…` command gets a text reply naming the commands.
// - Anything else gets a Markdown reply that quotes the message, with a list
//   and a Python block.
// A test may pass its own MockScript instead.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Message,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
  LanguageModelV4ToolResultOutput,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import {
  defaultMockScript,
  type MockConversation,
  type MockScript,
  type MockStep,
  type MockToolResult,
} from "@/tutor/mock-script.ts";

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

// The user's last message as plain text, what came before it, and the tool
// results that follow it.
function readPrompt(prompt: LanguageModelV4Prompt): {
  userText: string;
  conversation: MockConversation;
} {
  const lastUser = prompt.findLastIndex((message) => message.role === "user");
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
      earlierTexts: prompt.slice(0, Math.max(lastUser, 0)).flatMap(textsOf),
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
  const toolCalls = step.toolCalls.map(
    (call, callIndex): LanguageModelV4StreamPart => ({
      type: "tool-call",
      toolCallId: `mock-call-${index}-${callIndex}`,
      toolName: call.toolName,
      input: JSON.stringify(call.input),
    }),
  );
  let finishReason: "stop" | "tool-calls" = "stop";
  if (toolCalls.length > 0) {
    finishReason = "tool-calls";
  }
  return [
    ...toolCalls,
    {
      type: "finish",
      usage: MOCK_USAGE,
      finishReason: { unified: finishReason, raw: undefined },
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
// user's last message.
function stepNumber(prompt: LanguageModelV4Prompt): number {
  const lastUser = prompt.findLastIndex((message) => message.role === "user");
  return prompt.slice(lastUser + 1).filter((message) => message.role === "tool")
    .length;
}

function streamStep(
  script: MockScript,
  { prompt }: LanguageModelV4CallOptions,
): LanguageModelV4StreamResult {
  const { userText, conversation } = readPrompt(prompt);
  const step = stepNumber(prompt);
  const scripted = script(userText, conversation)[step] ?? {
    text: "",
    toolCalls: [],
  };
  return {
    stream: simulateReadableStream({
      chunks: stepChunks(scripted, step),
      initialDelayInMs: null,
      chunkDelayInMs: null,
    }),
  };
}

// The mock model, playing `script`, by default the commands described at the
// top of this file. It supports streaming only, as the tutor uses it.
function mockTutorModel(
  script: MockScript = defaultMockScript,
): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "mock",
    modelId: "tutor-mock",
    supportedUrls: {},
    doGenerate: (): Promise<never> =>
      Promise.reject(new Error("The mock tutor model only streams.")),
    doStream: (
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4StreamResult> =>
      Promise.resolve(streamStep(script, options)),
  };
}

export { mockTutorModel };
