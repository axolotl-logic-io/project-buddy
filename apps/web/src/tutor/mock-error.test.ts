// @vitest-environment node
import { streamText } from "ai";
import { describe, expect, test } from "vitest";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { mockErrorReply } from "@/tutor/mock-error.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";

describe("mockErrorReply", () => {
  test("fails the step with the Anthropic error event asked for", () => {
    expect(mockErrorReply("overloaded_error")).toEqual([
      {
        text: "",
        error: { type: "overloaded_error", message: "Mock overloaded_error" },
      },
    ]);
  });

  test.each([
    ["an error type Anthropic doesn't have", "teapot_error"],
    ["no type", ""],
    ["more after the type", "api_error now"],
  ])("answers %s with text, not a failure", (_name, errorType) => {
    expect(mockErrorReply(errorType)).toEqual([
      {
        text: expect.stringContaining("`/mock-error <type>`"),
        toolCalls: [],
      },
    ]);
  });

  test("fails the mock tutor's reply with the matching case", async () => {
    spyOnErrorLog();
    const errors: unknown[] = [];

    await streamText({
      model: mockTutorModel(),
      prompt: "  /mock-error overloaded_error ",
      onError: ({ error }: { error: unknown }): void => {
        errors.push(error);
      },
    }).consumeStream();

    expect(errors.map((error) => toAppError(error, "test").errorCase)).toEqual([
      "overloaded",
    ]);
  });
});
