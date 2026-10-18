import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { withoutProviderBookkeeping } from "@/tutor/provider-bookkeeping.ts";

const REPLY: UIMessage = {
  id: "reply",
  role: "assistant",
  parts: [
    { type: "custom", kind: "anthropic.message_start" },
    { type: "step-start" },
    { type: "custom", kind: "anthropic.fallback" },
    { type: "text", text: "Press Ctrl+B." },
    { type: "custom", kind: "anthropic.message_start" },
  ],
};

describe("withoutProviderBookkeeping", () => {
  test("drops Anthropic's call-start parts and keeps every other part in order", () => {
    expect(withoutProviderBookkeeping(REPLY)).toEqual({
      id: "reply",
      role: "assistant",
      parts: [
        { type: "step-start" },
        { type: "custom", kind: "anthropic.fallback" },
        { type: "text", text: "Press Ctrl+B." },
      ],
    });
  });

  test("leaves the message it was given unchanged", () => {
    const parts = [...REPLY.parts];

    withoutProviderBookkeeping(REPLY);

    expect(REPLY.parts).toEqual(parts);
  });
});
