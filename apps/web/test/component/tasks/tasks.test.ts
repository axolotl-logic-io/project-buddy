// A quest's tasks operations, which the construct's change_tasks tool, the
// user's controls and the composer's commands share: what each does, what
// it says it did, how its undo puts the tasks back, and the all-or-none rule.

import { describe, expect, test } from "vitest";
import {
  applyTasksOperations,
  applyTasksUndo,
  EMPTY_TASKS,
  moveAmongOpen,
  moveToPlace,
  nextTask,
  type Tasks,
  type TasksUndoOperation,
} from "@/tasks/tasks.ts";

const OWL: Tasks = {
  items: [
    { number: 1, text: "Gather reference photos", done: true },
    { number: 2, text: "Block out the body", done: false },
    { number: 3, text: "Sculpt the feathers", done: false },
    { number: 4, text: "Render a turntable", done: false },
  ],
  nextNumber: 5,
};

function texts(tasks: Tasks): string[] {
  return tasks.items.map(({ text, done }) => {
    if (done) {
      return `[done] ${text}`;
    }
    return text;
  });
}

// The tasks after undoing a change, which must change it.
function applyTasksUndoChanged(
  tasks: Tasks,
  change: Parameters<typeof applyTasksUndo>[1],
): Tasks {
  const outcome = applyTasksUndo(tasks, change);
  if (outcome.kind === "failed") {
    throw new Error(`The undo failed: ${outcome.reason}`);
  }
  return outcome.tasks;
}

// The tasks after operations that must change it.
function changed(
  tasks: Tasks,
  operations: readonly TasksUndoOperation[],
): Exclude<ReturnType<typeof applyTasksOperations>, { kind: "failed" }> {
  const outcome = applyTasksOperations(tasks, operations);
  if (outcome.kind === "failed") {
    throw new Error(`The operations failed: ${outcome.reason}`);
  }
  return outcome;
}

describe("tasks operations", () => {
  test("add a task at the end, or before another, with the next number", () => {
    const outcome = changed(OWL, [
      { op: "add", text: "Retopologize the head", before: 3 },
      { op: "add", text: "Share it" },
    ]);
    expect(texts(outcome.tasks)).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Retopologize the head",
      "Sculpt the feathers",
      "Render a turntable",
      "Share it",
    ]);
    // The new tasks take the next numbers, in the order they were added.
    const numbers = outcome.tasks.items.map(({ number }) => number);
    const [first, second, third, fourth] = OWL.items.map(
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
    expect(outcome.tasks.nextNumber).toBe(
      OWL.nextNumber + outcome.lines.length,
    );
    expect(outcome.lines).toEqual([
      {
        kind: "add",
        text: "Retopologize the head",
        before: "Sculpt the feathers",
      },
      { kind: "add", text: "Share it" },
    ]);
  });

  test("complete, reopen, change, move and remove tasks, saying what each did", () => {
    const outcome = changed(OWL, [
      { op: "complete", task: 2 },
      { op: "reopen", task: 1 },
      { op: "change", task: 4, text: "Render a floating turntable" },
      { op: "move", task: 4, before: 3 },
      { op: "remove", task: 1 },
    ]);
    expect(texts(outcome.tasks)).toEqual([
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

  test("the next task is the first open one", () => {
    expect(nextTask(OWL)?.text).toBe("Block out the body");
    expect(nextTask(EMPTY_TASKS)).toBeUndefined();
  });

  test("undo puts the tasks back as it was, numbers included", () => {
    const outcome = changed(OWL, [
      { op: "add", text: "Retopologize the head", before: 3 },
      { op: "complete", task: 2 },
      { op: "change", task: 3, text: "Sculpt the brass plates" },
      { op: "move", task: 4, before: 2 },
      { op: "remove", task: 1 },
    ]);
    const undone = changed(outcome.tasks, outcome.undo);
    expect(undone.tasks.items).toEqual(OWL.items);
  });

  test("undoing a removal after the task it went before is gone puts the task at the end", () => {
    const removed = changed(OWL, [{ op: "remove", task: 3 }]);
    const later = changed(removed.tasks, [{ op: "remove", task: 4 }]);
    const undone = changed(later.tasks, removed.undo);
    expect(texts(undone.tasks)).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Sculpt the feathers",
    ]);
  });

  test("undoing a change keeps a later edit of the same task", () => {
    const first = changed(OWL, [
      { op: "change", task: 3, text: "Sculpt the brass plates" },
    ]);
    const later = changed(first.tasks, [
      { op: "change", task: 3, text: "Sculpt the copper plates" },
    ]);
    expect(applyTasksUndo(later.tasks, first)).toEqual({
      kind: "failed",
      reason: "unchanged",
    });
    const both = changed(OWL, [
      { op: "change", task: 3, text: "Sculpt the brass plates" },
      { op: "complete", task: 2 },
    ]);
    const edited = changed(both.tasks, [
      { op: "change", task: 3, text: "Sculpt the copper plates" },
    ]);
    expect(texts(applyTasksUndoChanged(edited.tasks, both))).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Sculpt the copper plates",
      "Render a turntable",
    ]);
    expect(texts(applyTasksUndoChanged(both.tasks, both))).toEqual(texts(OWL));
  });

  test("an undo skips tasks removed since, and a moved task whose neighbour is gone goes to the end", () => {
    const moved = changed(OWL, [{ op: "move", task: 2, before: 4 }]);
    expect(texts(moved.tasks)).toEqual([
      "[done] Gather reference photos",
      "Sculpt the feathers",
      "Block out the body",
      "Render a turntable",
    ]);
    const neighbourGone = changed(moved.tasks, [{ op: "remove", task: 3 }]);
    expect(texts(applyTasksUndoChanged(neighbourGone.tasks, moved))).toEqual([
      "[done] Gather reference photos",
      "Render a turntable",
      "Block out the body",
    ]);
    const added = changed(OWL, [
      { op: "add", text: "Paint the eyes" },
      { op: "complete", task: 2 },
    ]);
    const addedGone = changed(added.tasks, [{ op: "remove", task: 5 }]);
    expect(texts(applyTasksUndoChanged(addedGone.tasks, added))).toEqual([
      "[done] Gather reference photos",
      "Block out the body",
      "Sculpt the feathers",
      "Render a turntable",
    ]);
    const onlyAdded = changed(OWL, [{ op: "add", text: "Paint the eyes" }]);
    const gone = changed(onlyAdded.tasks, [{ op: "remove", task: 5 }]);
    expect(applyTasksUndo(gone.tasks, onlyAdded)).toEqual({
      kind: "failed",
      reason: "unchanged",
    });
  });

  test("a task that isn't there fails the whole batch", () => {
    expect(
      applyTasksOperations(OWL, [
        { op: "complete", task: 2 },
        { op: "remove", task: 9 },
      ]),
    ).toEqual({ kind: "failed", reason: "missing-task" });
    expect(
      applyTasksOperations(OWL, [{ op: "add", text: "Share it", before: 9 }]),
    ).toEqual({ kind: "failed", reason: "missing-task" });
  });

  test("operations that change nothing are skipped, and a batch of only those fails", () => {
    expect(
      applyTasksOperations(OWL, [
        { op: "complete", task: 1 },
        { op: "change", task: 2, text: "Block out the body" },
        { op: "move", task: 2, before: 3 },
      ]),
    ).toEqual({ kind: "failed", reason: "unchanged" });
    const outcome = changed(OWL, [
      { op: "complete", task: 1 },
      { op: "complete", task: 2 },
    ]);
    expect(outcome.lines).toEqual([
      { kind: "complete", text: "Block out the body" },
    ]);
  });

  test("tasks can grow and reopen tasks without a capacity limit", () => {
    const ManyTasks = 1000;
    const many: Tasks = {
      items: Array.from({ length: ManyTasks }, (_, index) => ({
        number: index + 1,
        text: `Task ${index + 1}`,
        done: false,
      })),
      nextNumber: ManyTasks + 1,
    };
    const added = changed(many, [{ op: "add", text: "One more" }]);
    expect(added.tasks.items).toHaveLength(ManyTasks + 1);
    const completed = changed(added.tasks, [{ op: "complete", task: 1 }]);
    const reopened = changed(completed.tasks, [
      { op: "reopen", task: 1 },
      { op: "add", text: "Another" },
    ]);
    expect(reopened.tasks.items).toHaveLength(ManyTasks + 2);
    expect(reopened.tasks.items.every((task) => !task.done)).toBe(true);
  });

  test("moves among the open tasks task over the done ones", () => {
    const [gather, block, sculpt, render] = OWL.items.map(
      ({ number }) => number,
    );
    const open = OWL.items.filter(({ done }) => !done).length;
    expect(moveAmongOpen(OWL, sculpt ?? 0, "up")).toEqual({
      op: "move",
      task: sculpt,
      before: block,
    });
    expect(moveAmongOpen(OWL, block ?? 0, "down")).toEqual({
      op: "move",
      task: block,
      before: render,
    });
    expect(moveAmongOpen(OWL, block ?? 0, "up")).toBeUndefined();
    expect(moveAmongOpen(OWL, render ?? 0, "down")).toBeUndefined();
    expect(moveToPlace(OWL, render ?? 0, 1)).toEqual({
      op: "move",
      task: render,
      before: block,
    });
    expect(moveToPlace(OWL, block ?? 0, open)).toEqual({
      op: "move",
      task: block,
      before: undefined,
    });
    expect(moveToPlace(OWL, block ?? 0, open + 1)).toBeUndefined();
    expect(moveToPlace(OWL, gather ?? 0, 1)).toBeUndefined();
  });
});
