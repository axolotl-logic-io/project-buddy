import { isStepCount, streamText, tool } from "ai";
import { describe, expect, type Mock, test, vi } from "vitest";
import { z } from "zod";
import {
  type MockScript,
  type MockStep,
  mockTutorModel,
} from "@/tutor/mock-model.ts";

const ECHO_INPUT = z.object({ word: z.string() });
type EchoInput = z.infer<typeof ECHO_INPUT>;
const MAX_STEPS = 3;
const MARKDOWN_LIST_ITEM = /^- /mu;

// Runs the mock through the AI SDK with one tool, `echo`, and up to three
// steps, as the tutor would. The text is every step's text, in order.
async function runMock(
  userText: string,
  script?: MockScript,
): Promise<{ text: string; echo: Mock<(input: EchoInput) => string> }> {
  const echo = vi.fn((input: EchoInput): string => input.word);
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
  test("replies in Markdown with a list and a code block, quoting the message", async () => {
    const { text } = await runMock("How do I bevel?");

    expect(text).toContain('"How do I bevel?"');
    expect(text).toMatch(MARKDOWN_LIST_ITEM);
    expect(text).toContain("```python\n");
  });

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
});
