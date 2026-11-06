import type { LanguageModelV4Prompt } from "@ai-sdk/provider";
import { expect, test } from "vitest";
import { NEUTRAL_KICKOFF, userFirst } from "@/replies/chat-kickoff.ts";
import { mockConstructModel } from "@/replies/mock-model.ts";

test("synthetic provider opening context is labelled as non-human without changing the saved conversation", async () => {
  const history: LanguageModelV4Prompt = [
    { role: "assistant", content: [{ type: "text", text: "Welcome." }] },
  ];
  const middleware = userFirst(NEUTRAL_KICKOFF);
  const { transformParams } = middleware;
  if (transformParams === undefined) {
    throw new Error("No provider prompt transformer");
  }
  const result = await transformParams({
    type: "generate",
    params: { prompt: [...history] },
    model: mockConstructModel(),
  });
  expect(result.prompt[0]).toEqual({
    role: "user",
    content: [{ type: "text", text: NEUTRAL_KICKOFF }],
  });
  expect(NEUTRAL_KICKOFF).toContain("not a message from a person");
  expect(NEUTRAL_KICKOFF).toContain(
    "Do not count this context as a participant",
  );
  expect(result.prompt.slice(1)).toEqual(history);
  expect(history).toEqual([
    { role: "assistant", content: [{ type: "text", text: "Welcome." }] },
  ]);
});
