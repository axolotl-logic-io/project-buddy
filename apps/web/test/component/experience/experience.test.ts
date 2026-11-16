// Experience's rules: how ability points weigh into experience, where the
// triangular curve starts each circle, the titles circles take, and what a
// change to a quest's Tasks gains or takes back.

import { describe, expect, test } from "vitest";
import {
  circleAt,
  circleStart,
  experienceOf,
  NO_POINTS,
} from "@/experience/experience.ts";
import { taskPointChanges } from "@/experience/task-points.ts";
import type { Tasks } from "@/tasks/tasks.ts";

const GLAZE = { number: 4, text: "Glaze it", done: true };

const POTTERY: Tasks = {
  items: [
    { number: 1, text: "Wedge the clay", done: true },
    { number: 2, text: "Throw the bowl", done: false },
    { number: 3, text: "Trim the foot", done: false },
  ],
  nextNumber: 4,
};

// Where circles start: circle n at 5 · n(n − 1) / 2.
const STARTS = [
  { circle: 1, start: 0 },
  { circle: 2, start: 5 },
  { circle: 3, start: 15 },
  { circle: 4, start: 30 },
  { circle: 10, start: 225 },
];

// The first and last circle each title covers, with the title.
const TITLES = [
  { first: 1, last: 9, title: "Initiate" },
  { first: 10, last: 19, title: "Apprentice" },
  { first: 20, last: 29, title: "Practitioner" },
  { first: 30, last: 39, title: "Expert" },
  { first: 40, last: 59, title: "Master" },
  { first: 60, last: 79, title: "Pathfinder" },
  { first: 80, last: 99, title: "Grand Master" },
  { first: 100, last: 149, title: "Legendary" },
  { first: 150, last: 200, title: "Transcendent" },
] as const;

function titleAt(circle: number): string {
  return experienceOf({ ...NO_POINTS, noting: circleStart(circle) }).title;
}

describe("circles", () => {
  test("each circle needs five more experience than the one before", () => {
    expect(STARTS.map(({ circle }) => circleStart(circle))).toEqual(
      STARTS.map(({ start }) => start),
    );
  });

  test("experience reaches the circle whose start it has passed", () => {
    for (const { circle, start } of STARTS) {
      expect(circleAt(start)).toBe(circle);
      expect(circleAt(start - 1)).toBe(Math.max(1, circle - 1));
    }
  });

  test("circles take their title from the last titled circle reached", () => {
    for (const { first, last, title } of TITLES) {
      expect([titleAt(first), titleAt(last)]).toEqual([title, title]);
    }
  });
});

test("abilities weigh into experience: a completed task three, a completed quest nine", () => {
  const experience = experienceOf({
    "adding-tasks": 2,
    ideating: 1,
    noting: 1,
    "completing-tasks": 1,
    "completing-quests": 1,
  });
  expect(experience).toMatchObject({
    experience: 16,
    circle: 3,
    title: "Initiate",
    circleStart: 15,
    nextCircleStart: 30,
  });
});

describe("taskPointChanges", () => {
  test("added tasks and completions gain, reopenings take back", () => {
    const after: Tasks = {
      items: [
        { number: 1, text: "Wedge the clay", done: false },
        { number: 2, text: "Throw the bowl", done: true },
        { number: 3, text: "Trim the foot", done: false },
        GLAZE,
      ],
      nextNumber: GLAZE.number + 1,
    };
    expect(taskPointChanges(POTTERY, after)).toEqual({
      added: [GLAZE.number],
      completed: [2],
      reopened: [1],
    });
  });

  test("a removed task keeps its points and a restored one gains none", () => {
    const removed: Tasks = {
      items: POTTERY.items.filter((task) => task.number !== 1),
      nextNumber: 4,
    };
    expect(taskPointChanges(POTTERY, removed)).toEqual({
      added: [],
      completed: [],
      reopened: [],
    });
    expect(taskPointChanges(removed, POTTERY)).toEqual({
      added: [],
      completed: [],
      reopened: [],
    });
  });
});
