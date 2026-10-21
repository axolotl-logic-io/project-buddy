import {
  generateText,
  isStepCount,
  type ModelMessage,
  streamText,
  tool,
} from "ai";
import { afterEach, describe, expect, type Mock, test, vi } from "vitest";
import { z } from "zod";
import { ANSWER_NOW_NOTE, withAnswerNowNote } from "@/tutor/answer-now.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type {
  MockConversation,
  MockScript,
  MockStep,
} from "@/tutor/mock-script.ts";

const ECHO_INPUT = z.object({ word: z.string() });
type EchoInput = z.infer<typeof ECHO_INPUT>;
const MAX_STEPS = 3;
const STEP_DELAY_MS = 1000;

// Echoes its word, and fails for the word "fail".
function echoWord({ word }: EchoInput): string {
  if (word === "fail") {
    throw new Error("The echo failed");
  }
  return word;
}

// Runs the mock through the AI SDK with one tool, `echo`, and up to three
// steps, as the tutor would. The text is every step's text, in order.
async function runMock(
  userText: string,
  script?: MockScript,
): Promise<{ text: string; echo: Mock<(input: EchoInput) => string> }> {
  const echo = vi.fn(echoWord);
  const result = streamText({
    model: mockTutorModel(script),
    messages: [{ role: "user", content: userText }],
    tools: { echo: tool({ inputSchema: ECHO_INPUT, execute: echo }) },
    stopWhen: isStepCount(MAX_STEPS),
  });
  const steps = await result.steps;
  return { text: steps.map((step) => step.text).join(""), echo };
}

describe("mockTutorModel default script", () => {
  test("replies the same way to the same message", async () => {
    const first = await runMock("How do I bevel?");
    const second = await runMock("How do I bevel?");

    expect(second.text).toBe(first.text);
  });

  test("calls the tool a /mock-tool message names, then replies", async () => {
    const { text, echo } = await runMock('/mock-tool echo {"word":"bevel"}');

    expect(echo).toHaveBeenCalledTimes(1);
    expect(echo.mock.calls[0]?.[0]).toEqual({ word: "bevel" });
    expect(text).toContain("`echo`");
  });
});

describe("mockTutorModel scripts", () => {
  test("ends the reply at the first step without a tool call", async () => {
    const script: MockScript = (userText: string): MockStep[] => [
      { text: `Searching for ${userText}. `, toolCalls: [] },
      { text: "", toolCalls: [{ toolName: "echo", input: { word: "a" } }] },
      { text: "Found it.", toolCalls: [] },
    ];

    const { text, echo } = await runMock("bevel", script);

    expect(text).toBe("Searching for bevel. ");
    expect(echo).not.toHaveBeenCalled();
  });

  test("continues after each tool call until the script ends", async () => {
    const script: MockScript = (): MockStep[] => [
      {
        text: "Let me look. ",
        toolCalls: [{ toolName: "echo", input: { word: "a" } }],
      },
      { text: "", toolCalls: [{ toolName: "echo", input: { word: "b" } }] },
      { text: "Done.", toolCalls: [] },
    ];

    const { text, echo } = await runMock("bevel", script);

    expect(echo.mock.calls.map(([input]) => input)).toEqual([
      { word: "a" },
      { word: "b" },
    ]);
    expect(text).toBe("Let me look. Done.");
  });

  test("fails mid-stream, after its text, at a step with an error", async () => {
    const failure = new Error("Overloaded");
    const onError = vi.fn();
    const result = streamText({
      model: mockTutorModel(() => [{ text: "Half a reply", error: failure }]),
      messages: [{ role: "user", content: "bevel" }],
      onError,
    });

    await result.consumeStream();

    expect(await result.text).toBe("Half a reply");
    expect(onError).toHaveBeenCalledWith({ error: failure });
  });
});

describe("mockTutorModel delays", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("streams nothing of a step until its delay has passed", async () => {
    vi.useFakeTimers();
    const script: MockScript = (): MockStep[] => [
      { text: "Slow reply.", toolCalls: [], delayMs: STEP_DELAY_MS },
    ];
    const result = streamText({
      model: mockTutorModel(script),
      messages: [{ role: "user", content: "bevel" }],
    });
    let streamed = "";
    const streaming = (async (): Promise<void> => {
      for await (const delta of result.textStream) {
        streamed += delta;
      }
    })();

    await vi.advanceTimersByTimeAsync(STEP_DELAY_MS - 1);
    expect(streamed).toBe("");
    await vi.advanceTimersByTimeAsync(1);
    await streaming;

    expect(streamed).toBe("Slow reply.");
  });
});

describe("mockTutorModel generating all at once", () => {
  const script: MockScript = (userText: string): MockStep[] => [
    {
      text: `Looking up ${userText}. `,
      toolCalls: [{ toolName: "echo", input: { word: "a" } }],
    },
    { text: "Found it.", toolCalls: [] },
  ];

  test("plays the same steps as streaming does", async () => {
    const echo = vi.fn(echoWord);
    const result = await generateText({
      model: mockTutorModel(script),
      messages: [{ role: "user", content: "bevel" }],
      tools: { echo: tool({ inputSchema: ECHO_INPUT, execute: echo }) },
      stopWhen: isStepCount(MAX_STEPS),
    });

    expect(result.steps.map((step) => step.text).join("")).toBe(
      (await runMock("bevel", script)).text,
    );
    expect(echo.mock.calls.map(([input]) => input)).toEqual([{ word: "a" }]);
    expect(result.finishReason).toBe("stop");
  });

  test("fails with a step's error", async () => {
    const failure = new Error("Overloaded");

    await expect(
      generateText({
        model: mockTutorModel(() => [{ text: "Half a reply", error: failure }]),
        messages: [{ role: "user", content: "bevel" }],
        maxRetries: 0,
      }),
    ).rejects.toBe(failure);
  });
});

describe("mockTutorModel conversation", () => {
  test("hands the script the system prompt, the earlier messages' texts and this reply's tool results", async () => {
    const seen: MockConversation[] = [];
    const script: MockScript = (
      _userText: string,
      conversation: MockConversation,
    ): MockStep[] => {
      seen.push(conversation);
      return [
        {
          text: "",
          toolCalls: [
            { toolName: "echo", input: { word: "a" } },
            { toolName: "echo", input: { word: "fail" } },
          ],
        },
      ];
    };
    const messages: ModelMessage[] = [
      { role: "user", content: "My zebra has no tail." },
      { role: "assistant", content: "Add a tail." },
      { role: "user", content: "How?" },
    ];
    const result = streamText({
      model: mockTutorModel(script),
      instructions: "Memory: the zebra needs stripes.",
      messages,
      tools: { echo: tool({ inputSchema: ECHO_INPUT, execute: echoWord }) },
      stopWhen: isStepCount(2),
    });

    await result.consumeStream();

    expect(seen[1]).toEqual({
      systemTexts: ["Memory: the zebra needs stripes."],
      earlierTexts: ["My zebra has no tail.", "Add a tail."],
      toolResults: [
        { toolName: "echo", failed: false, output: "a" },
        { toolName: "echo", failed: true, output: "Error: The echo failed" },
      ],
      answerNow: false,
    });
  });
});

describe("mockTutorModel answer-now call", () => {
  test("hands the script the user's message, this reply's tool results and answerNow", async () => {
    const seen: [string, MockConversation][] = [];
    const script: MockScript = (
      userText: string,
      conversation: MockConversation,
    ): MockStep[] => {
      seen.push([userText, conversation]);
      if (conversation.answerNow) {
        return [{ text: "Bevel with Ctrl+B.", toolCalls: [] }];
      }
      return [
        { text: "", toolCalls: [{ toolName: "echo", input: { word: "a" } }] },
        { text: "", toolCalls: [] },
      ];
    };
    const tools = {
      echo: tool({ inputSchema: ECHO_INPUT, execute: echoWord }),
    };
    const messages: ModelMessage[] = [{ role: "user", content: "How?" }];
    const reply = streamText({
      model: mockTutorModel(script),
      messages,
      tools,
      stopWhen: isStepCount(MAX_STEPS),
    });

    const answer = streamText({
      model: mockTutorModel(script),
      messages: withAnswerNowNote(
        [...messages, ...(await reply.responseMessages)],
        ANSWER_NOW_NOTE,
      ),
      tools,
    });

    expect(await answer.text).toBe("Bevel with Ctrl+B.");
    expect(seen.at(-1)).toEqual([
      "How?",
      {
        systemTexts: [],
        earlierTexts: [],
        toolResults: [{ toolName: "echo", failed: false, output: "a" }],
        answerNow: true,
      },
    ]);
  });
});
