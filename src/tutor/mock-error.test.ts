// @vitest-environment node
import { streamText } from "ai";
import { describe, expect, test } from "vitest";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { mockErrorChunks } from "@/tutor/mock-error.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";

describe("mockErrorChunks", () => {
  test("fails the stream with the Anthropic error event asked for", () => {
    expect(mockErrorChunks("  /mock-error overloaded_error ")).toEqual([
      { type: "stream-start", warnings: [] },
      {
        type: "error",
        error: { type: "overloaded_error", message: "Mock overloaded_error" },
      },
    ]);
  });

  test.each([
    ["an ordinary message", "How do I bevel an edge?"],
    ["an error type Anthropic doesn't have", "/mock-error teapot_error"],
    ["a command without a type", "/mock-error"],
    ["a command with more after the type", "/mock-error api_error now"],
  ])("leaves %s alone", (_name, userText) => {
    expect(mockErrorChunks(userText)).toBeUndefined();
  });

  test("fails the mock tutor's reply with the matching case", async () => {
    spyOnErrorLog();
    const errors: unknown[] = [];

    await streamText({
      model: mockTutorModel(),
      prompt: "/mock-error overloaded_error",
      onError: ({ error }: { error: unknown }): void => {
        errors.push(error);
      },
    }).consumeStream();

    expect(errors.map((error) => toAppError(error, "test").errorCase)).toEqual([
      "overloaded",
    ]);
  });
});
