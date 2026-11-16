// The chat's built-in commands: which messages the composer runs as commands
// rather than sending to the construct, and what each tasks command asks of
// the tasks, naming tasks by their numbers.

import { describe, expect, test } from "vitest";
import { TASK_TEXT_MAX_LENGTH, type Tasks } from "@/tasks/tasks.ts";
import { isChatCommand, parseTasksCommand } from "@/tasks/tasks-commands.ts";

const TASKS: Tasks = {
  items: [
    { number: 1, text: "Gather reference photos", done: true },
    { number: 2, text: "Block out the body", done: false },
    { number: 3, text: "Sculpt the feathers", done: false },
  ],
  nextNumber: 4,
};

describe("chat commands", () => {
  test("a message that starts with / and a name is a command", () => {
    expect(isChatCommand("/tasks")).toBe(false);
    expect(isChatCommand("  /done 3")).toBe(true);
    expect(isChatCommand("/whatever")).toBe(true);
    expect(isChatCommand("Finished /tasks stuff")).toBe(false);
    expect(isChatCommand("/ nothing")).toBe(false);
    expect(isChatCommand("")).toBe(false);
  });

  test.each([
    ["/tasks", { kind: "show" }],
    ["/undo", { kind: "undo" }],
    [
      "/add   Retopologize\nthe head ",
      {
        kind: "change",
        operations: [{ op: "add", text: "Retopologize the head" }],
      },
    ],
    ["/done", { kind: "change", operations: [{ op: "complete", task: 2 }] }],
    ["/done #3", { kind: "change", operations: [{ op: "complete", task: 3 }] }],
    ["/reopen 1", { kind: "change", operations: [{ op: "reopen", task: 1 }] }],
    [
      "/edit 3 Sculpt the brass plates",
      {
        kind: "change",
        operations: [
          { op: "change", task: 3, text: "Sculpt the brass plates" },
        ],
      },
    ],
    [
      "/move 3 1",
      { kind: "change", operations: [{ op: "move", task: 3, before: 2 }] },
    ],
    ["/drop 2", { kind: "change", operations: [{ op: "remove", task: 2 }] }],
  ])("%s", (text, command) => {
    expect(parseTasksCommand(text, TASKS)).toEqual(command);
  });

  test.each([
    ["/frobnicate", { kind: "unknown", name: "frobnicate" }],
    ["/add", { kind: "no-text", name: "add" }],
    ["/edit 3", { kind: "no-text", name: "edit" }],
    [`/add ${"x".repeat(TASK_TEXT_MAX_LENGTH + 1)}`, { kind: "too-long" }],
    ["/done 9", { kind: "no-task", task: "9" }],
    ["/drop", { kind: "no-task", task: undefined }],
    ["/move 3", { kind: "no-place", most: 2 }],
    ["/move 3 5", { kind: "no-place", most: 2 }],
  ])("%s does nothing and says why", (text, problem) => {
    expect(parseTasksCommand(text, TASKS)).toEqual({
      kind: "problem",
      problem,
    });
  });

  test("/done with no task and nothing open says there's no task", () => {
    const allDone: Tasks = {
      items: [{ number: 1, text: "Gather reference photos", done: true }],
      nextNumber: 2,
    };
    expect(parseTasksCommand("/done", allDone)).toEqual({
      kind: "problem",
      problem: { kind: "no-task", task: undefined },
    });
  });
});

test.each(["/help", "/LOOK", "/search bevel", "/cast example"])(
  "construct command reaches the conversation: %s",
  (text) => {
    expect(isChatCommand(text)).toBe(false);
  },
);
