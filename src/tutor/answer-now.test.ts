import type { LanguageModelV4Message } from "@ai-sdk/provider";
import {
  isStepCount,
  type ModelMessage,
  type StepResult,
  streamText,
  tool,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, test } from "vitest";
import {
  endsWithoutText,
  isAnswerNowNote,
  withAnswerNowNote,
} from "@/tutor/answer-now.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type { MockStep } from "@/tutor/mock-script.ts";
import {
  CITE_MANUAL_INPUT,
  CITE_MANUAL_TOOL,
} from "@/tutor/tools/cite-manual-contract.ts";
import {
  SEARCH_MANUAL_INPUT,
  SEARCH_MANUAL_TOOL,
} from "@/tutor/tools/search-manual-contract.ts";

const SHE_OR_HER = /\b(?:she|her)\b/iu;

const QUESTION: ModelMessage = {
  role: "user",
  content: "How do I add a bevel modifier?",
};

const ANSWER = "Select the edges, then press Ctrl+B and drag.";

// Stand-ins for the tutor's lookup and citing tools, which find nothing.
const STAND_IN_TOOLS = {
  [CITE_MANUAL_TOOL]: tool({
    inputSchema: CITE_MANUAL_INPUT,
    execute: (): { citations: [] } => ({ citations: [] }),
  }),
  [SEARCH_MANUAL_TOOL]: tool({
    inputSchema: SEARCH_MANUAL_INPUT,
    execute: (): { sections: [] } => ({ sections: [] }),
  }),
};

const SEARCH: MockStep = {
  text: "",
  toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } }],
};
const CITE: MockStep = {
  text: "",
  toolCalls: [{ toolName: CITE_MANUAL_TOOL, input: { urls: [] } }],
};
const EMPTY: MockStep = { text: "", toolCalls: [] };

// The steps of a reply whose model calls play steps.
async function replySteps(
  steps: readonly MockStep[],
): Promise<StepResult<typeof STAND_IN_TOOLS>[]> {
  const result = streamText({
    model: mockTutorModel(() => steps),
    messages: [QUESTION],
    tools: STAND_IN_TOOLS,
    stopWhen: isStepCount(steps.length),
  });
  return await result.steps;
}

// The note's text, as withAnswerNowNote adds it.
function noteText(): string {
  const note = withAnswerNowNote([]).at(-1);
  if (note?.role !== "user" || typeof note.content !== "string") {
    return "";
  }
  return note.content;
}

// The prompt the model gets for messages, in the provider's own form.
async function modelPrompt(
  messages: ModelMessage[],
): Promise<LanguageModelV4Message[]> {
  const model = new MockLanguageModelV4({
    doStream: mockTutorModel(() => [{ text: "Done.", toolCalls: [] }]).doStream,
  });
  await streamText({ model, messages }).consumeStream();
  return model.doStreamCalls[0]?.prompt ?? [];
}

describe("withAnswerNowNote", () => {
  test("adds the note after the conversation, from the app", () => {
    const messages = withAnswerNowNote([QUESTION]);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(QUESTION);
    expect(messages[1]?.role).toBe("user");
    expect(noteText()).toContain("not from the user");
  });

  test("asks to carry on with the same reply to the user's last message", () => {
    expect(noteText()).toContain("the user's last message, above this note");
    expect(noteText()).toContain("same reply");
    expect(noteText()).not.toContain("Write your whole reply");
  });

  test("counts the searches above as this reply's lookups", () => {
    expect(noteText()).toContain(
      `\`${SEARCH_MANUAL_TOOL}\` results above are your lookups for this reply`,
    );
    expect(noteText()).toContain("steps, menu paths, shortcuts and settings");
  });

  test("says the cited sections already show, and asks for no more tools", () => {
    expect(noteText()).toContain(`\`${CITE_MANUAL_TOOL}\``);
    expect(noteText()).toContain("already show under the reply");
    expect(noteText()).toContain("Call no tools");
  });

  test("says what to do when the results don't cover the question", () => {
    expect(noteText()).toContain("don't cover");
    expect(noteText()).toContain("say so plainly");
  });

  test("calls the person the user", () => {
    expect(noteText()).not.toMatch(SHE_OR_HER);
  });
});

describe("endsWithoutText", () => {
  test("holds for searches, then citing, then an empty call", async () => {
    const steps = await replySteps([SEARCH, SEARCH, CITE, EMPTY]);

    expect(endsWithoutText(steps)).toBe(true);
  });

  test("counts text written in the call that cites as the answer", async () => {
    const steps = await replySteps([SEARCH, { ...CITE, text: ANSWER }, EMPTY]);

    expect(endsWithoutText(steps)).toBe(false);
  });

  test("counts text written after citing as the answer", async () => {
    const steps = await replySteps([SEARCH, CITE, { ...EMPTY, text: ANSWER }]);

    expect(endsWithoutText(steps)).toBe(false);
  });

  test("doesn't count text written before a search as the answer", async () => {
    const steps = await replySteps([{ ...SEARCH, text: ANSWER }, CITE, EMPTY]);

    expect(endsWithoutText(steps)).toBe(true);
  });
});

describe("isAnswerNowNote", () => {
  test("knows the note as the model receives it", async () => {
    const prompt = await modelPrompt(withAnswerNowNote([QUESTION]));

    expect(prompt.map(isAnswerNowNote)).toEqual([false, true]);
  });

  test("knows no other message as the note", async () => {
    const prompt = await modelPrompt([
      QUESTION,
      { role: "assistant", content: noteText() },
      { role: "user", content: `${noteText()} Thanks.` },
    ]);

    expect(prompt.map(isAnswerNowNote)).toEqual([false, false, false]);
  });
});
