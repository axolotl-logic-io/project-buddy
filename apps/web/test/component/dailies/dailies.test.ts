// The days of a Dailies quest: the date a new day takes, the streaks of its
// recurring steps, the gaps that end them, and the Progress grid.

import { describe, expect, test } from "vitest";
import {
  type DailiesDay,
  dayDate,
  dayGrid,
  LOCAL_DATE,
  streaks,
  todayHere,
} from "@/dailies/dailies.ts";
import type { Tasks } from "@/tasks/tasks.ts";

// The step numbers, and the grid's usual week.
const STRETCH = 1;
const SKETCH = 2;
const VET = 3;
const WEEK = 7;
const SKETCH_RUN = 5;
const TWICE_RUN = 3;
const SHOWN = 3;

const TASKS: Tasks = {
  steps: [
    { number: 1, text: "Stretch", done: false, recurring: true },
    { number: 2, text: "Sketch", done: true, recurring: true },
    { number: 3, text: "Book the vet", done: true },
  ],
  nextNumber: 4,
};

// An ended day on date, with the recurring steps done that are listed.
function ended(date: string, done: readonly number[]): DailiesDay {
  return {
    date,
    startedAt: new Date(`${date}T08:00:00Z`),
    steps: [
      { number: 1, text: "Stretch", done: done.includes(1) },
      { number: 2, text: "Sketch", done: done.includes(2) },
    ],
  };
}

function going(date: string): DailiesDay {
  return { date, startedAt: new Date(`${date}T08:00:00Z`) };
}

describe("Dailies days", () => {
  test("a local date is a real YYYY-MM-DD date", () => {
    expect(LOCAL_DATE.safeParse("2026-11-15").success).toBe(true);
    expect(LOCAL_DATE.safeParse("2026-02-30").success).toBe(false);
    expect(LOCAL_DATE.safeParse("2026-1-5").success).toBe(false);
    expect(LOCAL_DATE.safeParse("tomorrow").success).toBe(false);
  });

  test("a new day takes the browser's date when it is believable", () => {
    const now = new Date("2026-11-15T23:30:00Z");
    expect(dayDate("2026-11-16", now)).toBe("2026-11-16");
    expect(dayDate("2026-11-14", now)).toBe("2026-11-14");
    expect(dayDate("2026-11-20", now)).toBe("2026-11-15");
    expect(dayDate("not a date", now)).toBe("2026-11-15");
    expect(dayDate(null, now)).toBe("2026-11-15");
  });

  test("today here is the browser's calendar date", () => {
    expect(todayHere(new Date("2026-11-05T23:59:00"))).toBe("2026-11-05");
  });

  test("use_case_daily_streaks", () => {
    const days = [
      ended("2026-11-10", [1, 2]),
      ended("2026-11-11", [1, 2]),
      ended("2026-11-12", [2]),
      ended("2026-11-13", [1, 2]),
      going("2026-11-14"),
    ];
    // Stretch: done on the 13th, missed on the 12th; not yet today.
    // Sketch: done every day, and today too.
    expect(streaks(days, TASKS)).toEqual(
      new Map([
        [STRETCH, 1],
        [SKETCH, SKETCH_RUN],
      ]),
    );
  });

  test("a gap, a date with no day started, ends every streak", () => {
    const days = [
      ended("2026-11-10", [1, 2]),
      ended("2026-11-11", [1, 2]),
      // No day on the 12th.
      ended("2026-11-13", [1, 2]),
      going("2026-11-14"),
    ];
    expect(streaks(days, TASKS)).toEqual(
      new Map([
        [STRETCH, 1],
        [SKETCH, 2],
      ]),
    );
  });

  test("a gap before today breaks a streak even with today done", () => {
    const days = [ended("2026-11-10", [1, 2]), going("2026-11-14")];
    expect(streaks(days, TASKS)).toEqual(new Map([[2, 1]]));
  });

  test("days started twice on one date count as one date", () => {
    const days = [
      ended("2026-11-12", [2]),
      ended("2026-11-13", []),
      ended("2026-11-13", [2]),
      going("2026-11-14"),
    ];
    expect(streaks(days, TASKS).get(SKETCH)).toBe(TWICE_RUN);
  });

  test("one-off steps and steps with no days have no streak", () => {
    expect(streaks([], TASKS)).toEqual(new Map());
    expect(streaks([going("2026-11-14")], TASKS).has(VET)).toBe(false);
  });

  test("the day grid marks done, missed, pending and gap days", () => {
    const days = [
      ended("2026-11-10", [1, 2]),
      ended("2026-11-11", [2]),
      ended("2026-11-13", [1, 2]),
      going("2026-11-14"),
    ];
    expect(dayGrid(days, TASKS, WEEK)).toEqual({
      dates: [
        "2026-11-10",
        "2026-11-11",
        "2026-11-12",
        "2026-11-13",
        "2026-11-14",
      ],
      rows: [
        {
          number: 1,
          text: "Stretch",
          marks: ["done", "missed", "gap", "done", "pending"],
        },
        {
          number: 2,
          text: "Sketch",
          marks: ["done", "done", "gap", "done", "done"],
        },
      ],
    });
  });

  test("the day grid shows at most count dates, newest last", () => {
    const days = [ended("2026-11-01", [2]), going("2026-11-14")];
    expect(dayGrid(days, TASKS, SHOWN).dates).toEqual([
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
    ]);
    expect(dayGrid([], TASKS, WEEK)).toEqual({ dates: [], rows: [] });
  });

  test("a step made recurring later is untracked on earlier days", () => {
    const days = [
      {
        date: "2026-11-13",
        startedAt: new Date("2026-11-13T08:00:00Z"),
        steps: [{ number: 2, text: "Sketch", done: true }],
      },
      going("2026-11-14"),
    ];
    expect(dayGrid(days, TASKS, WEEK).rows[0]?.marks).toEqual([
      "untracked",
      "pending",
    ]);
  });
});
