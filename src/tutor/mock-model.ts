// A deterministic stand-in for Claude that the AI SDK runs like any model.
// TUTOR_MODEL=mock selects it, so tests never call Anthropic. It keeps no
// state between calls: each call plays the script step that matches the
// number of tool results since the user's last message.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";

// A tool call the mock makes, with the input the tool's schema should accept.
interface MockToolCall {
  readonly toolName: string;
  readonly input: unknown;
}

// One model call: text to stream, then tool calls. A step with tool calls
// makes the AI SDK run them and call the model again for the next step; a
// step without them ends the reply.
interface MockStep {
  readonly text: string;
  readonly toolCalls: readonly MockToolCall[];
}

// The steps of one reply, chosen from the text of the user's last message.
type MockScript = (userText: string) => readonly MockStep[];

// Streams text a word at a time, as Claude streams it in pieces.
const WORD_BOUNDARY = /(?<= )/u;

// "/mock-tool <tool name> <JSON input>" asks the default script for a tool
// call, so end-to-end tests can drive any tool.
const MOCK_TOOL_COMMAND = /^\/mock-tool (?<toolName>\S+) (?<input>.+)$/su;

const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
} as const;

// The default reply: Markdown with a list and a code block, so the chat
// shows its renderer working.
function markdownReply(userText: string): string {
  return [
    `This is the mock tutor. You said: "${userText}".`,
    "",
    "- Select the edges.",
    "- Press **Ctrl+B** to bevel them.",
    "",
    "```python",
    "import bpy",
    "bpy.ops.mesh.bevel(offset=0.1)",
    "```",
  ].join("\n");
}

function defaultScript(userText: string): readonly MockStep[] {
  const command = MOCK_TOOL_COMMAND.exec(userText.trim())?.groups;
  if (command === undefined) {
    return [{ text: markdownReply(userText), toolCalls: [] }];
  }
  const { toolName = "", input = "" } = command;
  return [
    {
      text: "",
      toolCalls: [{ toolName, input: JSON.parse(input) }],
    },
    { text: `The mock tutor called \`${toolName}\`.`, toolCalls: [] },
  ];
}

// The user's last message as plain text, and how many tool results follow it.
function readPrompt(prompt: LanguageModelV4Prompt): {
  userText: string;
  step: number;
} {
  const lastUser = prompt.findLastIndex((message) => message.role === "user");
  const userMessage = prompt[lastUser];
  let userText = "";
  if (userMessage?.role === "user") {
    userText = userMessage.content
      .flatMap((part) => {
        if (part.type === "text") {
          return [part.text];
        }
        return [];
      })
      .join("\n");
  }
  const step = prompt
    .slice(lastUser + 1)
    .filter((message) => message.role === "tool").length;
  return { userText, step };
}

function stepChunks(
  step: MockStep,
  index: number,
): LanguageModelV4StreamPart[] {
  const textId = `text-${index}`;
  const text: LanguageModelV4StreamPart[] = [];
  if (step.text !== "") {
    text.push(
      { type: "text-start", id: textId },
      ...step.text.split(WORD_BOUNDARY).map(
        (delta): LanguageModelV4StreamPart => ({
          type: "text-delta",
          id: textId,
          delta,
        }),
      ),
      { type: "text-end", id: textId },
    );
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
    { type: "stream-start", warnings: [] },
    ...text,
    ...toolCalls,
    {
      type: "finish",
      usage: MOCK_USAGE,
      finishReason: { unified: finishReason, raw: undefined },
    },
  ];
}

function streamStep(
  script: MockScript,
  { prompt }: LanguageModelV4CallOptions,
): LanguageModelV4StreamResult {
  const { userText, step } = readPrompt(prompt);
  const scripted = script(userText)[step] ?? { text: "", toolCalls: [] };
  return {
    stream: simulateReadableStream({
      chunks: stepChunks(scripted, step),
      initialDelayInMs: null,
      chunkDelayInMs: null,
    }),
  };
}

// The mock model, playing `script` (by default, the Markdown reply and
// /mock-tool commands). It supports streaming only, as the tutor uses it.
function mockTutorModel(script: MockScript = defaultScript): LanguageModelV4 {
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

export type { MockScript, MockStep, MockToolCall };
export { mockTutorModel };
