import { describe, expect, test } from "vitest";
import { defaultMockScript } from "@/tutor/mock-script.ts";
import { MOCK_SLOW_DELAY_MS, mockSlowReply } from "@/tutor/mock-slow.ts";

describe("mockSlowReply", () => {
  test("is one text step, quoting the message, that starts after the delay", () => {
    expect(mockSlowReply("Tell me about bevels.")).toEqual([
      {
        text: 'The mock tutor took its time. You said: "Tell me about bevels.".',
        toolCalls: [],
        delayMs: MOCK_SLOW_DELAY_MS,
      },
    ]);
  });

  test("answers /mock-slow in the default script", () => {
    expect(
      defaultMockScript("/mock-slow Tell me about bevels.", {
        systemTexts: [],
        earlierTexts: [],
        toolResults: [],
      }),
    ).toEqual(mockSlowReply("Tell me about bevels."));
  });
});
