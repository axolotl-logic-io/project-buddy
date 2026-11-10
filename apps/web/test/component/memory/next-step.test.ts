// A project's next step, read from its memory's "Next step:" line with no
// model call, as the landing page's Today section shows it.
import { describe, expect, test } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  NEXT_STEP_LABEL,
  nextStepOf,
  nextStepOfQuest,
} from "@/memory/next-step.ts";
import { EMPTY_PLAN } from "@/plan/plan.ts";

function nextStepIn(text: string): string | undefined {
  return nextStepOf({ text, version: MEMORY_VERSION_NUMBER.parse(1) });
}

describe("a project's next step", () => {
  test("is the text after the label the construct is asked to write", () => {
    expect(
      nextStepIn(
        `# Sea turtle\n\nGoal: a game-ready model.\n\n${NEXT_STEP_LABEL} retopo the flipper\n`,
      ),
    ).toBe("retopo the flipper");
  });

  test.each([
    ["a list item", "- Next step: pick a bed layout"],
    ["bold", "**Next step:** pick a bed layout"],
    ["a bold label", "**Next step**: pick a bed layout"],
    ["an italic label", "_Next step:_ pick a bed layout"],
    ["a bold list item", "- __Next step__: pick a bed layout"],
    ["a heading", "## Next step: pick a bed layout"],
    ["another case", "NEXT STEP:   pick a bed layout  "],
  ])("is read from %s", (_kind, line) => {
    expect(nextStepIn(`Goal: a garden.\n${line}\nMilestones: …`)).toBe(
      "pick a bed layout",
    );
  });

  test.each([
    [
      "bold inside it",
      "Next step: **retopo** the flipper",
      "**retopo** the flipper",
    ],
    [
      "italics after a bold label",
      "- **Next step:** _retopo_ the flipper",
      "_retopo_ the flipper",
    ],
    [
      "a trailing double underscore",
      "Next step: rename __init__",
      "rename __init__",
    ],
    ["a trailing star", "Next step: water the bed*", "water the bed*"],
  ])("keeps %s as written", (_kind, line, step) => {
    expect(nextStepIn(line)).toBe(step);
  });

  test("is the first one when the memory records several", () => {
    expect(nextStepIn("Next step: first\nNext step: second")).toBe("first");
  });

  test.each([
    ["an empty memory", ""],
    ["a memory with no next step", "Goal: a garden.\n- Milestone: pick beds"],
    ["the words in a sentence", "We talked about the next step: beds."],
    ["a blank next step", "Next step:\nGoal: a garden."],
    ["a label with unmatched emphasis", "**Next step: pick a bed layout"],
  ])("is missing from %s", (_kind, text) => {
    expect(nextStepIn(text)).toBeUndefined();
  });
});

describe("a quest's next step", () => {
  const memory = {
    text: `${NEXT_STEP_LABEL} retopo the flipper`,
    version: MEMORY_VERSION_NUMBER.parse(1),
  };

  test("is its plan's first open step", () => {
    expect(
      nextStepOfQuest(memory, {
        steps: [
          { number: 1, text: "Block out the shell", done: true },
          { number: 2, text: "Bake the normal map", done: false },
        ],
        nextNumber: 3,
      }),
    ).toBe("Bake the normal map");
  });

  test("is the Journal's line while the plan has no steps", () => {
    expect(nextStepOfQuest(memory, EMPTY_PLAN)).toBe("retopo the flipper");
  });

  test("is none once every step is done, whatever the Journal says", () => {
    expect(
      nextStepOfQuest(memory, {
        steps: [{ number: 1, text: "Block out the shell", done: true }],
        nextNumber: 2,
      }),
    ).toBeUndefined();
  });
});
