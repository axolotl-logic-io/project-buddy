// The days of a Dailies quest: the date a new day takes, the streaks of its
// recurring tasks and their chains, the gaps that end them, and the
// Progress grid.

import { describe, expect, test } from "vitest";
import {
  type DailiesDay,
  dayDate,
  dayGrid,
  LOCAL_DATE,
  streakChains,
  todayHere,
} from "@/dailies/dailies.ts";
import type { Tasks } from "@/tasks/tasks.ts";

// The task numbers, and the grid's usual week.
const STRETCH = 1;
const SKETCH = 2;
const VET = 3;
const WEEK = 7;
const SKETCH_RUN = 5;
const TWICE_RUN = 3;
const SHOWN = 3;
const DAY_MS = 86_400_000;

// How many days in a row Sketch was done before today, done again today,
// and the milestone its chain leads to.
const MILESTONE_CASES: readonly { run: number; milestone: number }[] = [
  { run: 2, milestone: 3 },
  { run: 3, milestone: 7 },
  { run: 6, milestone: 7 },
  { run: 13, milestone: 14 },
  { run: 29, milestone: 30 },
  { run: 30, milestone: 60 },
  { run: 59, milestone: 60 },
  { run: 60, milestone: 90 },
];

// A 45-day streak's chain, from the 30th day to the 60th.
const LONG = {
  run: 44,
  chain: { streak: 45, doneToday: true, milestone: 60, links: 30, earned: 14 },
};

const TASKS: Tasks = {
  items: [
    { number: 1, text: "Stretch", done: false, recurring: true },
    { number: 2, text: "Sketch", done: true, recurring: true },
    { number: 3, text: "Book the vet", done: true },
  ],
  nextNumber: 4,
};

// An ended day on date, with the recurring tasks done that are listed.
function ended(date: string, done: readonly number[]): DailiesDay {
  return {
    date,
    startedAt: new Date(`${date}T08:00:00Z`),
    tasks: [
      { number: 1, text: "Stretch", done: done.includes(1) },
      { number: 2, text: "Sketch", done: done.includes(2) },
    ],
  };
}

function going(date: string): DailiesDay {
  return { date, startedAt: new Date(`${date}T08:00:00Z`) };
}

// Each recurring task's streak, by its number, leaving out those at 0.
function streaks(
  days: readonly DailiesDay[],
  tasks: Tasks,
): ReadonlyMap<number, number> {
  const found = new Map<number, number>();
  for (const [number, chain] of streakChains(days, tasks)) {
    if (chain.streak > 0) {
      found.set(number, chain.streak);
    }
  }
  return found;
}

// days ended days in a row with Sketch done, up to 2026-11-14, then that
// day still going.
function sketchRun(days: number): DailiesDay[] {
  const start = Date.parse("2026-11-14T00:00:00Z");
  return [
    ...Array.from({ length: days }, (_, index) =>
      ended(
        new Date(start - (days - index) * DAY_MS).toISOString().slice(0, 10),
        [SKETCH],
      ),
    ),
    going("2026-11-14"),
  ];
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

  test("one-off tasks and tasks with no days have no streak", () => {
    expect(streakChains([], TASKS)).toEqual(new Map());
    expect(streaks([going("2026-11-14")], TASKS).has(VET)).toBe(false);
  });

  test("a streak chain leads to the next milestone, with today's link after the earned ones", () => {
    const days = [
      ended("2026-11-12", [1, 2]),
      ended("2026-11-13", [1, 2]),
      going("2026-11-14"),
    ];
    const chains = streakChains(days, TASKS);
    // Stretch is open today: two links earned, today's next, toward 3.
    expect(chains.get(STRETCH)).toEqual({
      streak: 2,
      doneToday: false,
      milestone: 3,
      links: 3,
      earned: 2,
    });
    // Sketch is done today, which reaches the milestone.
    expect(chains.get(SKETCH)).toEqual({
      streak: 3,
      doneToday: true,
      milestone: 3,
      links: 3,
      earned: 2,
    });
  });

  test("a recurring task with no streak still has a chain toward 3", () => {
    const chains = streakChains([going("2026-11-14")], TASKS);
    expect(chains.get(STRETCH)).toEqual({
      streak: 0,
      doneToday: false,
      milestone: 3,
      links: 3,
      earned: 0,
    });
    expect(chains.has(VET)).toBe(false);
  });

  test("milestones run 3, 7, 14 and 30 days, then every 30", () => {
    for (const { run, milestone } of MILESTONE_CASES) {
      expect(streakChains(sketchRun(run), TASKS).get(SKETCH)?.milestone).toBe(
        milestone,
      );
    }
  });

  test("past 30 days a chain starts at the last multiple of 30", () => {
    const chain = streakChains(sketchRun(LONG.run), TASKS).get(SKETCH);
    expect(chain).toEqual(LONG.chain);
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

  test("a task made recurring later is untracked on earlier days", () => {
    const days = [
      {
        date: "2026-11-13",
        startedAt: new Date("2026-11-13T08:00:00Z"),
        tasks: [{ number: 2, text: "Sketch", done: true }],
      },
      going("2026-11-14"),
    ];
    expect(dayGrid(days, TASKS, WEEK).rows[0]?.marks).toEqual([
      "untracked",
      "pending",
    ]);
  });
});
