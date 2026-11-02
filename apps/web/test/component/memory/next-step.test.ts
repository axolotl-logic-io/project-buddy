// A project's next step, read from its memory's "Next step:" line with no
// model call, as the landing page's Today section shows it.
import { describe, expect, test } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { NEXT_STEP_LABEL, nextStepOf } from "@/memory/next-step.ts";

function nextStepIn(text: string): string | undefined {
  return nextStepOf({ text, version: MEMORY_VERSION_NUMBER.parse(1) });
}

describe("a project's next step", () => {
  test("is the text after the label the buddy is asked to write", () => {
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
    ["a heading", "## Next step: pick a bed layout"],
    ["another case", "NEXT STEP:   pick a bed layout  "],
  ])("is read from %s", (_kind, line) => {
    expect(nextStepIn(`Goal: a garden.\n${line}\nMilestones: …`)).toBe(
      "pick a bed layout",
    );
  });

  test("is the first one when the memory records several", () => {
    expect(nextStepIn("Next step: first\nNext step: second")).toBe("first");
  });

  test.each([
    ["an empty memory", ""],
    ["a memory with no next step", "Goal: a garden.\n- Milestone: pick beds"],
    ["the words in a sentence", "We talked about the next step: beds."],
    ["a blank next step", "Next step:\nGoal: a garden."],
  ])("is missing from %s", (_kind, text) => {
    expect(nextStepIn(text)).toBeUndefined();
  });
});
