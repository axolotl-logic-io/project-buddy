import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Message,
  LanguageModelV4Prompt,
} from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, test } from "vitest";
import {
  isNeutralKickoff,
  isOpeningKickoff,
  NEUTRAL_KICKOFF,
  OPENING_KICKOFF,
  userFirst,
} from "@/tutor/chat-kickoff.ts";

const SYSTEM: LanguageModelV4Message = {
  role: "system",
  content: "You are a Blender tutor.",
  providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
};

const OPENING: LanguageModelV4Message = {
  role: "assistant",
  content: [{ type: "text", text: "What would you like to make?" }],
};

const ANSWER: LanguageModelV4Message = {
  role: "user",
  content: [{ type: "text", text: "A fox for my game." }],
};

const NEUTRAL_TURN: LanguageModelV4Message = {
  role: "user",
  content: [{ type: "text", text: NEUTRAL_KICKOFF }],
};

// The prompt that userFirst sends the model for prompt.
async function sentPrompt(
  prompt: LanguageModelV4Prompt,
): Promise<LanguageModelV4Prompt> {
  const params: LanguageModelV4CallOptions = { prompt };
  const transformed = await userFirst.transformParams?.({
    type: "stream",
    params,
    model: new MockLanguageModelV4(),
  });
  return transformed?.prompt ?? [];
}

describe("userFirst", () => {
  test("puts the neutral turn before the tutor's opening, after the system messages", async () => {
    expect(await sentPrompt([SYSTEM, OPENING, ANSWER])).toEqual([
      SYSTEM,
      NEUTRAL_TURN,
      OPENING,
      ANSWER,
    ]);
  });

  test("leaves the system messages as they are, for the prompt cache", async () => {
    const [system] = await sentPrompt([SYSTEM, OPENING]);

    expect(system).toBe(SYSTEM);
  });

  test("leaves a conversation that starts with the user alone", async () => {
    const prompt = [SYSTEM, ANSWER, OPENING];

    expect(await sentPrompt(prompt)).toBe(prompt);
  });

  test("gives a prompt with no conversation the neutral turn", async () => {
    expect(await sentPrompt([SYSTEM])).toEqual([SYSTEM, NEUTRAL_TURN]);
  });
});

describe("the kickoffs", () => {
  test("each knows its own text and nothing else", () => {
    expect(isOpeningKickoff(String(OPENING_KICKOFF.content))).toBe(true);
    expect(isOpeningKickoff(NEUTRAL_KICKOFF)).toBe(false);
    expect(isNeutralKickoff(NEUTRAL_KICKOFF)).toBe(true);
    expect(isNeutralKickoff(String(OPENING_KICKOFF.content))).toBe(false);
    expect(isNeutralKickoff("A fox for my game.")).toBe(false);
    expect(isOpeningKickoff("")).toBe(false);
  });
});
