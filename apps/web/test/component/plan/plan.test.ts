// A quest's plan operations, which the construct's change_plan tool, the
// user's controls and the composer's commands share: what each does, what
// it says it did, how its undo puts the plan back, and the all-or-none rule.

import { describe, expect, test } from "vitest";
import {
  applyPlanOperations,
  applyPlanUndo,
  EMPTY_PLAN,
  MOST_OPEN_STEPS,
  moveAmongOpen,
  moveToPlace,
  nextPlanStep,
  type Plan,
  type PlanUndoOperation,
} from "@/plan/plan.ts";

const OWL: Plan = {
  steps: [
    { number: 1, text: "Gather reference photos", done: true },
    { number: 2, text: "Block out the body", done: false },
    { number: 3, text: "Sculpt the feathers", done: false },
    { number: 4, text: "Render a turntable", done: false },
  ],
  nextNumber: 5,
};

function texts(plan: Plan): string[] {
  return plan.steps.map(({ text, done }) => {
    if (done) {
      return `[done] ${text}`;
    }
    return text;
  });
}

// The plan after undoing a change, which must change it.
function applyPlanUndoChanged(
  plan: Plan,
  change: Parameters<typeof applyPlanUndo>[1],
): Plan {
  const outcome = applyPlanUndo(plan, change);
  if (outcome.kind === "failed") {
    throw new Error(`The undo failed: ${outcome.reason}`);
  }
  return outcome.plan;
}

// The plan after operations that must change it.
function changed(
  plan: Plan,
  operations: readonly PlanUndoOperation[],
): Exclude<ReturnType<typeof applyPlanOperations>, { kind: "failed" }> {
  const outcome = applyPlanOperations(plan, operations);
  if (outcome.kind === "failed") {
    throw new Error(`The operations failed: ${outcome.reason}`);
  }
  return outcome;
}

describe("plan operations", () => {
  test("add a step at the end, or before another, with the next number", () => {
    const outcome = changed(OWL, [
      { op: "add", text: "Retopologize the head", before: 3 },
      { op: "add", text: "Share it" },
    ]);
    expect(texts(outcome.plan)).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Retopologize the head",
      "Sculpt the feathers",
      "Render a turntable",
      "Share it",
    ]);
    // The new steps take the next numbers, in the order they were added.
    const numbers = outcome.plan.steps.map(({ number }) => number);
    const [first, second, third, fourth] = OWL.steps.map(
      ({ number }) => number,
    );
    expect(numbers).toEqual([
      first,
      second,
      OWL.nextNumber,
      third,
      fourth,
      OWL.nextNumber + 1,
    ]);
    expect(outcome.plan.nextNumber).toBe(OWL.nextNumber + outcome.lines.length);
    expect(outcome.lines).toEqual([
      {
        kind: "add",
        text: "Retopologize the head",
        before: "Sculpt the feathers",
      },
      { kind: "add", text: "Share it" },
    ]);
  });

  test("complete, reopen, change, move and remove steps, saying what each did", () => {
    const outcome = changed(OWL, [
      { op: "complete", step: 2 },
      { op: "reopen", step: 1 },
      { op: "change", step: 4, text: "Render a floating turntable" },
      { op: "move", step: 4, before: 3 },
      { op: "remove", step: 1 },
    ]);
    expect(texts(outcome.plan)).toEqual([
      "[done] Block out the body",
      "Render a floating turntable",
      "Sculpt the feathers",
    ]);
    expect(outcome.lines.map(({ kind }) => kind)).toEqual([
      "complete",
      "reopen",
      "change",
      "move",
      "remove",
    ]);
  });

  test("the next step is the first open one", () => {
    expect(nextPlanStep(OWL)?.text).toBe("Block out the body");
    expect(nextPlanStep(EMPTY_PLAN)).toBeUndefined();
  });

  test("undo puts the plan back as it was, numbers included", () => {
    const outcome = changed(OWL, [
      { op: "add", text: "Retopologize the head", before: 3 },
      { op: "complete", step: 2 },
      { op: "change", step: 3, text: "Sculpt the brass plates" },
      { op: "move", step: 4, before: 2 },
      { op: "remove", step: 1 },
    ]);
    const undone = changed(outcome.plan, outcome.undo);
    expect(undone.plan.steps).toEqual(OWL.steps);
  });

  test("undoing a removal after the step it went before is gone puts the step at the end", () => {
    const removed = changed(OWL, [{ op: "remove", step: 3 }]);
    const later = changed(removed.plan, [{ op: "remove", step: 4 }]);
    const undone = changed(later.plan, removed.undo);
    expect(texts(undone.plan)).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Sculpt the feathers",
    ]);
  });

  test("undoing a change keeps a later edit of the same step", () => {
    const first = changed(OWL, [
      { op: "change", step: 3, text: "Sculpt the brass plates" },
    ]);
    const later = changed(first.plan, [
      { op: "change", step: 3, text: "Sculpt the copper plates" },
    ]);
    expect(applyPlanUndo(later.plan, first)).toEqual({
      kind: "failed",
      reason: "unchanged",
    });
    const both = changed(OWL, [
      { op: "change", step: 3, text: "Sculpt the brass plates" },
      { op: "complete", step: 2 },
    ]);
    const edited = changed(both.plan, [
      { op: "change", step: 3, text: "Sculpt the copper plates" },
    ]);
    expect(texts(applyPlanUndoChanged(edited.plan, both))).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Sculpt the copper plates",
      "Render a turntable",
    ]);
    expect(texts(applyPlanUndoChanged(both.plan, both))).toEqual(texts(OWL));
  });

  test("an undo skips steps removed since, and a moved step whose neighbour is gone goes to the end", () => {
    const moved = changed(OWL, [{ op: "move", step: 2, before: 4 }]);
    expect(texts(moved.plan)).toEqual([
      "[done] Gather reference photos",
      "Sculpt the feathers",
      "Block out the body",
      "Render a turntable",
    ]);
    const neighbourGone = changed(moved.plan, [{ op: "remove", step: 3 }]);
    expect(texts(applyPlanUndoChanged(neighbourGone.plan, moved))).toEqual([
      "[done] Gather reference photos",
      "Render a turntable",
      "Block out the body",
    ]);
    const added = changed(OWL, [
      { op: "add", text: "Paint the eyes" },
      { op: "complete", step: 2 },
    ]);
    const addedGone = changed(added.plan, [{ op: "remove", step: 5 }]);
    expect(texts(applyPlanUndoChanged(addedGone.plan, added))).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Sculpt the feathers",
      "Render a turntable",
    ]);
    const onlyAdded = changed(OWL, [{ op: "add", text: "Paint the eyes" }]);
    const gone = changed(onlyAdded.plan, [{ op: "remove", step: 5 }]);
    expect(applyPlanUndo(gone.plan, onlyAdded)).toEqual({
      kind: "failed",
      reason: "unchanged",
    });
  });

  test("a step that isn't there fails the whole batch", () => {
    expect(
      applyPlanOperations(OWL, [
        { op: "complete", step: 2 },
        { op: "remove", step: 9 },
      ]),
    ).toEqual({ kind: "failed", reason: "missing-step" });
    expect(
      applyPlanOperations(OWL, [{ op: "add", text: "Share it", before: 9 }]),
    ).toEqual({ kind: "failed", reason: "missing-step" });
  });

  test("operations that change nothing are skipped, and a batch of only those fails", () => {
    expect(
      applyPlanOperations(OWL, [
        { op: "complete", step: 1 },
        { op: "change", step: 2, text: "Block out the body" },
        { op: "move", step: 2, before: 3 },
      ]),
    ).toEqual({ kind: "failed", reason: "unchanged" });
    const outcome = changed(OWL, [
      { op: "complete", step: 1 },
      { op: "complete", step: 2 },
    ]);
    expect(outcome.lines).toEqual([
      { kind: "complete", text: "Block out the body" },
    ]);
  });

  test(`a plan holds at most ${MOST_OPEN_STEPS} open steps`, () => {
    const full: Plan = {
      steps: Array.from({ length: MOST_OPEN_STEPS }, (_, index) => ({
        number: index + 1,
        text: `Step ${index + 1}`,
        done: false,
      })),
      nextNumber: MOST_OPEN_STEPS + 1,
    };
    expect(
      applyPlanOperations(full, [{ op: "add", text: "One more" }]),
    ).toEqual({ kind: "failed", reason: "too-many-steps" });
    const roomMade = changed(full, [
      { op: "complete", step: 1 },
      { op: "add", text: "One more" },
    ]);
    expect(roomMade.plan.steps).toHaveLength(MOST_OPEN_STEPS + 1);
  });

  test(`the ${MOST_OPEN_STEPS}-step limit is on the plan a batch leaves, not on each operation`, () => {
    const full: Plan = {
      steps: Array.from({ length: MOST_OPEN_STEPS }, (_, index) => ({
        number: index + 1,
        text: `Step ${index + 1}`,
        done: false,
      })),
      nextNumber: MOST_OPEN_STEPS + 1,
    };
    const swapped = changed(full, [
      { op: "add", text: "One more" },
      { op: "remove", step: 3 },
    ]);
    expect(swapped.plan.steps.filter((step) => !step.done)).toHaveLength(
      MOST_OPEN_STEPS,
    );
    const done = changed(full, [{ op: "complete", step: 1 }]);
    expect(
      applyPlanOperations(done.plan, [
        { op: "reopen", step: 1 },
        { op: "add", text: "One more" },
      ]),
    ).toEqual({ kind: "failed", reason: "too-many-steps" });
  });

  test("moves among the open steps step over the done ones", () => {
    const [gather, block, sculpt, render] = OWL.steps.map(
      ({ number }) => number,
    );
    const open = OWL.steps.filter(({ done }) => !done).length;
    expect(moveAmongOpen(OWL, sculpt ?? 0, "up")).toEqual({
      op: "move",
      step: sculpt,
      before: block,
    });
    expect(moveAmongOpen(OWL, block ?? 0, "down")).toEqual({
      op: "move",
      step: block,
      before: render,
    });
    expect(moveAmongOpen(OWL, block ?? 0, "up")).toBeUndefined();
    expect(moveAmongOpen(OWL, render ?? 0, "down")).toBeUndefined();
    expect(moveToPlace(OWL, render ?? 0, 1)).toEqual({
      op: "move",
      step: render,
      before: block,
    });
    expect(moveToPlace(OWL, block ?? 0, open)).toEqual({
      op: "move",
      step: block,
      before: undefined,
    });
    expect(moveToPlace(OWL, block ?? 0, open + 1)).toBeUndefined();
    expect(moveToPlace(OWL, gather ?? 0, 1)).toBeUndefined();
  });
});
