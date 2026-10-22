import { describe, expect, test } from "vitest";
import type { BuddyParts } from "@/buddies/buddy.ts";
import { parseBuddyParts } from "@/buddies/buddy-parts-schema.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";

// Mr. Tee's parts, as they were stored before the central chat part.
function storedBeforeCentralChat(): Omit<BuddyParts, "centralChat"> {
  const { centralChat: _added, ...stored } = getBuddy("mr-tee").parts;
  return stored;
}

describe("stored buddy parts", () => {
  test("lacking the central chat part read it as the default buddy's text", () => {
    const stored = storedBeforeCentralChat();

    expect(parseBuddyParts(stored)).toEqual({
      ...stored,
      centralChat: getBuddy(DEFAULT_BUDDY_ID).parts.centralChat,
    });
  });

  test("keep their own central chat part", () => {
    const stored = { ...storedBeforeCentralChat(), centralChat: "Just chat." };

    expect(parseBuddyParts(stored)?.centralChat).toBe("Just chat.");
  });

  test("lacking the new project tool part read it as the default buddy's text", () => {
    const { createProjectTool: _added, ...stored } = getBuddy("mr-tee").parts;

    expect(parseBuddyParts(stored)).toEqual({
      ...stored,
      createProjectTool: getBuddy(DEFAULT_BUDDY_ID).parts.createProjectTool,
    });
  });

  test("keep their own new project tool part", () => {
    const stored = {
      ...getBuddy("mr-tee").parts,
      createProjectTool: "Make it a project.",
    };

    expect(parseBuddyParts(stored)?.createProjectTool).toBe(
      "Make it a project.",
    );
  });
});

describe("stored planning skills", () => {
  test("old buddy and chat snapshots gain only the missing skill defaults", () => {
    const {
      brainstorming: _brainstorming,
      projectBreakdown: _breakdown,
      ...stored
    } = getBuddy("mr-tee").parts;

    expect(parseBuddyParts(stored)).toEqual({
      ...stored,
      brainstorming: getBuddy(DEFAULT_BUDDY_ID).parts.brainstorming,
      projectBreakdown: getBuddy(DEFAULT_BUDDY_ID).parts.projectBreakdown,
    });
  });

  test("missing either skill leaves the supplied other skill unchanged", () => {
    const { brainstorming: _brainstorming, ...withoutBrainstorming } = {
      ...getBuddy("mr-tee").parts,
      projectBreakdown: "Custom milestones.",
    };
    const { projectBreakdown: _breakdown, ...withoutBreakdown } = {
      ...getBuddy("mr-tee").parts,
      brainstorming: "Custom choices.",
    };

    expect(parseBuddyParts(withoutBrainstorming)?.projectBreakdown).toBe(
      "Custom milestones.",
    );
    expect(parseBuddyParts(withoutBreakdown)?.brainstorming).toBe(
      "Custom choices.",
    );
  });

  test("keeps custom and deliberately empty skill text", () => {
    const stored = {
      ...getBuddy("mr-tee").parts,
      brainstorming: "Explore my options.",
      projectBreakdown: "",
    };

    expect(parseBuddyParts(stored)).toEqual(stored);
  });

  test.each(["brainstorming", "projectBreakdown"])(
    "rejects an invalid supplied %s instead of silently defaulting it",
    (key) => {
      expect(
        parseBuddyParts({ ...getBuddy("mr-tee").parts, [key]: 42 }),
      ).toBeUndefined();
    },
  );

  test("lacking any other part are not a buddy's parts", () => {
    const { answerNow: _missing, ...stored } = getBuddy("mr-tee").parts;

    expect(parseBuddyParts(stored)).toBeUndefined();
  });
});

describe.each([
  { key: "brainstorming", other: "projectBreakdown" },
  { key: "projectBreakdown", other: "brainstorming" },
] as const)("a stored $key with its other skill missing", ({ key, other }) => {
  test("keeps intentionally empty text while defaulting only the missing skill", () => {
    const { [other]: _missing, ...stored } = getBuddy("mr-tee").parts;
    const supplied = { ...stored, [key]: "" };

    expect(parseBuddyParts(supplied)).toEqual({
      ...supplied,
      [other]: getBuddy(DEFAULT_BUDDY_ID).parts[other],
    });
  });

  test.each([
    { label: "number", value: 42 },
    { label: "null", value: null },
    { label: "boolean", value: false },
    { label: "array", value: ["Custom instructions"] },
    { label: "object", value: { text: "Custom instructions" } },
  ])("rejects a supplied $label instead of defaulting it", ({ value }) => {
    const { [other]: _missing, ...stored } = getBuddy("mr-tee").parts;

    expect(parseBuddyParts({ ...stored, [key]: value })).toBeUndefined();
  });
});
