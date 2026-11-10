// The chat's built-in commands: which messages the composer runs as commands
// rather than sending to the construct, and what each plan command asks of
// the plan, naming steps by their numbers.
import { describe, expect, test } from "vitest";
import { PLAN_STEP_TEXT_MAX_LENGTH, type Plan } from "@/plan/plan.ts";
import { isChatCommand, parsePlanCommand } from "@/plan/plan-commands.ts";

const PLAN: Plan = {
  steps: [
    { number: 1, text: "Gather reference photos", done: true },
    { number: 2, text: "Block out the body", done: false },
    { number: 3, text: "Sculpt the feathers", done: false },
  ],
  nextNumber: 4,
};

describe("chat commands", () => {
  test("a message that starts with / and a name is a command", () => {
    expect(isChatCommand("/plan", false)).toBe(true);
    expect(isChatCommand("  /done 3", false)).toBe(true);
    expect(isChatCommand("/whatever", false)).toBe(true);
    expect(isChatCommand("Finished /plan stuff", false)).toBe(false);
    expect(isChatCommand("/ nothing", false)).toBe(false);
    expect(isChatCommand("", false)).toBe(false);
  });

  test("the mock model's commands go to it while it runs, and are commands otherwise", () => {
    expect(isChatCommand("/mock-tool change_plan {}", true)).toBe(false);
    expect(isChatCommand("/mock-tool change_plan {}", false)).toBe(true);
    expect(isChatCommand("/plan", true)).toBe(true);
  });

  test.each([
    ["/plan", { kind: "show" }],
    ["/undo", { kind: "undo" }],
    [
      "/add   Retopologize\nthe head ",
      {
        kind: "change",
        operations: [{ op: "add", text: "Retopologize the head" }],
      },
    ],
    ["/done", { kind: "change", operations: [{ op: "complete", step: 2 }] }],
    ["/done #3", { kind: "change", operations: [{ op: "complete", step: 3 }] }],
    ["/reopen 1", { kind: "change", operations: [{ op: "reopen", step: 1 }] }],
    [
      "/edit 3 Sculpt the brass plates",
      {
        kind: "change",
        operations: [
          { op: "change", step: 3, text: "Sculpt the brass plates" },
        ],
      },
    ],
    [
      "/move 3 1",
      { kind: "change", operations: [{ op: "move", step: 3, before: 2 }] },
    ],
    ["/drop 2", { kind: "change", operations: [{ op: "remove", step: 2 }] }],
  ])("%s", (text, command) => {
    expect(parsePlanCommand(text, PLAN)).toEqual(command);
  });

  test.each([
    ["/frobnicate", { kind: "unknown", name: "frobnicate" }],
    ["/add", { kind: "no-text", name: "add" }],
    ["/edit 3", { kind: "no-text", name: "edit" }],
    [`/add ${"x".repeat(PLAN_STEP_TEXT_MAX_LENGTH + 1)}`, { kind: "too-long" }],
    ["/done 9", { kind: "no-step", step: "9" }],
    ["/drop", { kind: "no-step", step: undefined }],
    ["/move 3", { kind: "no-place", most: 2 }],
    ["/move 3 5", { kind: "no-place", most: 2 }],
  ])("%s does nothing and says why", (text, problem) => {
    expect(parsePlanCommand(text, PLAN)).toEqual({ kind: "problem", problem });
  });

  test("/done with no step and nothing open says there's no step", () => {
    const allDone: Plan = {
      steps: [{ number: 1, text: "Gather reference photos", done: true }],
      nextNumber: 2,
    };
    expect(parsePlanCommand("/done", allDone)).toEqual({
      kind: "problem",
      problem: { kind: "no-step", step: undefined },
    });
  });
});
