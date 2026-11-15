// For browser tests of pages that show a quest's tasks: a stand-in for
// src/tasks/tasks-store.ts, which a test file mounts with
//   vi.mock("@/tasks/tasks-store.ts", () => import("../tasks/tasks-store-test-kit.ts"));
// Every quest's tasks is FOX_TASKS_STATE: steps with long words and a done
// step, so pages show each part of the tasks.

import { vi } from "vitest";
import type { Tasks, TasksState } from "@/tasks/tasks.ts";
import type * as store from "@/tasks/tasks-store.ts";

// A step of one word, longer than a phone's screen is wide.
const LONG_STEP_REPEATS = 12;
const LONG_STEP = "Retopologize".repeat(LONG_STEP_REPEATS);

const FOX_TASKS: Tasks = {
  steps: [
    { number: 1, text: "Gather reference photos of red foxes", done: true },
    { number: 2, text: "Block out the body and the tail", done: false },
    { number: 3, text: LONG_STEP, done: false },
    { number: 4, text: "Render a turntable", done: false },
  ],
  nextNumber: 5,
};

const FOX_TASKS_STATE: TasksState = {
  version: 3,
  tasks: FOX_TASKS,
  undone: [],
};

const readTasksState = vi.fn<typeof store.readTasksState>(() =>
  Promise.resolve(FOX_TASKS_STATE),
);
const readTasks = vi.fn<typeof store.readTasks>(() =>
  Promise.resolve(FOX_TASKS),
);

export { readTasks, readTasksState };
