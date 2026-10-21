import { describe, expect, test } from "vitest";
import { defaultMockScript } from "@/tutor/mock-script.ts";
import { MOCK_SLOW_DELAY_MS, mockSlowReply } from "@/tutor/mock-slow.ts";

describe("mockSlowReply", () => {
  test("is one text step, quoting the message, that starts after the delay", () => {
    const steps = mockSlowReply("Tell me about bevels.");
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      toolCalls: [],
      delayMs: MOCK_SLOW_DELAY_MS,
    });
    expect(steps[0]?.text).toContain("Tell me about bevels.");
  });

  test("answers /mock-slow in the default script", () => {
    expect(
      defaultMockScript("/mock-slow Tell me about bevels.", {
        systemTexts: [],
        earlierTexts: [],
        toolResults: [],
        answerNow: false,
      }),
    ).toEqual(mockSlowReply("Tell me about bevels."));
  });
});
