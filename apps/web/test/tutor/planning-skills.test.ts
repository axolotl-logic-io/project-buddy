import type { SystemModelMessage } from "ai";
import { describe, expect, test } from "vitest";
import { type Buddy, getBuddy } from "@/buddies/index.ts";
import { FLAGS, type FlagId } from "@/flags/flags.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { renderTutorInstructions } from "@/tutor/system-prompt.ts";

const BRAINSTORMING = "Explore {{name}}'s choices.";
const BREAKDOWN = "Break {{name}}'s goal into milestones.";
const buddy: Buddy = {
  ...getBuddy("hippy"),
  parts: {
    ...getBuddy("hippy").parts,
    brainstorming: BRAINSTORMING,
    projectBreakdown: BREAKDOWN,
  },
};

const CHOICES: readonly {
  readonly hidden: readonly FlagId[];
  readonly brainstorming: boolean;
  readonly breakdown: boolean;
}[] = [
  { hidden: [], brainstorming: true, breakdown: true },
  { hidden: ["brainstorming"], brainstorming: false, breakdown: true },
  { hidden: ["project-breakdown"], brainstorming: true, breakdown: false },
  {
    hidden: ["brainstorming", "project-breakdown"],
    brainstorming: false,
    breakdown: false,
  },
];

function instructions(
  kind: "central" | "project",
  hiddenFlags: readonly FlagId[],
): SystemModelMessage[] {
  const context = { buddy, userName: "Mabel", hiddenFlags };
  if (kind === "central") {
    return renderTutorInstructions({ kind, ...context });
  }
  return renderTutorInstructions({
    kind,
    ...context,
    projectName: "Low-poly fox",
    isInterviewChat: false,
    memory: EMPTY_MEMORY,
  });
}

function prompt(
  kind: "central" | "project",
  hiddenFlags: readonly FlagId[],
): string {
  return instructions(kind, hiddenFlags)
    .map(({ content }) => content)
    .join("\n");
}

describe.each(["central", "project"] as const)(
  "planning skills in a %s chat",
  (kind) => {
    test.each(CHOICES)(
      "includes only enabled skill parts for $hidden",
      (choice) => {
        const text = prompt(kind, choice.hidden);

        expect(text.includes("Explore Mabel's choices.")).toBe(
          choice.brainstorming,
        );
        expect(text.includes("Break Mabel's goal into milestones.")).toBe(
          choice.breakdown,
        );
        expect(buddy.parts.brainstorming).toBe(BRAINSTORMING);
        expect(buddy.parts.projectBreakdown).toBe(BREAKDOWN);
      },
    );

    test.each(CHOICES)(
      "switches $hidden change only their own supplied instructions",
      (choice) => {
        const [shared, ...chat] = instructions(kind, choice.hidden);
        const [baseline, ...baselineChat] = instructions(kind, []);
        const sections = [buddy.parts.role, buddy.parts.citation];
        if (choice.brainstorming) {
          sections.push("Explore Mabel's choices.");
        }
        if (choice.breakdown) {
          sections.push("Break Mabel's goal into milestones.");
        }

        expect(shared).toEqual({
          ...baseline,
          content: sections.join("\n\n"),
        });
        expect(chat).toEqual(baselineChat);
      },
    );

    test("display-only extras never change supplied instructions", () => {
      const displayOnly = FLAGS.filter(
        ({ id }) => id !== "brainstorming" && id !== "project-breakdown",
      ).map(({ id }) => id);

      expect(instructions(kind, displayOnly)).toEqual(instructions(kind, []));
    });
  },
);

describe("use_case_buddy_brainstorming", () => {
  test("defaults on independently of prompt mechanics", () => {
    expect(FLAGS.find(({ id }) => id === "brainstorming")?.defaultOn).toBe(
      true,
    );
    expect(prompt("central", ["persona-mechanics"])).toContain(
      "Explore Mabel's choices.",
    );
  });
});

describe("use_case_project_breakdown", () => {
  test("defaults on independently of prompt mechanics", () => {
    expect(FLAGS.find(({ id }) => id === "project-breakdown")?.defaultOn).toBe(
      true,
    );
    expect(prompt("project", ["persona-mechanics"])).toContain(
      "Break Mabel's goal into milestones.",
    );
  });
});

test("deliberately empty skills add no instructions or separators", () => {
  const [shared] = renderTutorInstructions({
    kind: "central",
    buddy: {
      ...buddy,
      parts: { ...buddy.parts, brainstorming: "", projectBreakdown: "" },
    },
    userName: undefined,
    hiddenFlags: [],
  });

  expect(shared?.content).toBe(
    [buddy.parts.role, buddy.parts.citation].join("\n\n"),
  );
});
