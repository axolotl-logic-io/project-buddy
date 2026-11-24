// The streaks of a quest's recurring tasks: the date of a moment in the
// owner's time zone, each task's streak and its chain, the missed days that
// end them, and the Day grid.

import { describe, expect, test } from "vitest";
import {
  dayGrid,
  localDate,
  MAX_STREAK_LINKS,
  markRows,
  sharedDates,
  streakChains,
  type TaskHistory,
  type TrackedTask,
  withMark,
} from "@/streaks/streaks.ts";

const TODAY = "2026-11-20";
const STRETCH = 1;
const SKETCH = 2;
const DAY_MS = 86_400_000;
// The Day grid's dates: a week, ending today.
const WEEK = 7;
// More days than a chain shows links for.
const LONG_STREAK = 44;

function history(
  checkOffs: Readonly<Record<number, readonly string[]>>,
): TaskHistory {
  return {
    today: TODAY,
    timeZone: "UTC",
    checkOffs: Object.entries(checkOffs).map(([number, dates]) => ({
      number: Number(number),
      dates,
    })),
  };
}

function tracked(
  number: number,
  done: boolean,
  createdAt = new Date("2026-01-01T00:00:00Z"),
): TrackedTask {
  return { number, text: `Task ${number}`, done, createdAt };
}

// The dates count days before today, newest last.
function daysBefore(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const moment = Date.parse(`${TODAY}T00:00:00Z`) - (count - index) * DAY_MS;
    return new Date(moment).toISOString().slice(0, 10);
  });
}

describe("localDate", () => {
  test("gives the date in the time zone, not in UTC", () => {
    const moment = new Date("2026-11-20T03:30:00Z");
    expect(localDate(moment, "UTC")).toBe("2026-11-20");
    expect(localDate(moment, "America/Los_Angeles")).toBe("2026-11-19");
    expect(localDate(moment, "Pacific/Auckland")).toBe("2026-11-20");
    expect(
      localDate(new Date("2026-11-20T12:00:00Z"), "Pacific/Auckland"),
    ).toBe("2026-11-21");
  });
});

describe("streakChains", () => {
  test("counts the days up to yesterday until today's check-off, then today too", () => {
    const checkOffs = history({
      [STRETCH]: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"],
    });
    expect(
      streakChains(checkOffs, [tracked(STRETCH, false)]).get(STRETCH),
    ).toEqual({ streak: 4, doneToday: false, links: 5, earned: 4 });
    expect(
      streakChains(checkOffs, [tracked(STRETCH, true)]).get(STRETCH),
    ).toEqual({ streak: 5, doneToday: true, links: 5, earned: 4 });
  });

  test("a day missed yesterday ends the streak", () => {
    const checkOffs = history({ [STRETCH]: daysBefore(2).slice(0, 1) });
    expect(
      streakChains(checkOffs, [tracked(STRETCH, false)]).get(STRETCH),
    ).toMatchObject({ streak: 0 });
  });

  test("each task keeps its own streak", () => {
    const chains = streakChains(
      history({ [STRETCH]: daysBefore(2), [SKETCH]: daysBefore(1) }),
      [tracked(STRETCH, true), tracked(SKETCH, false)],
    );
    expect(chains.get(STRETCH)).toMatchObject({ streak: 3 });
    expect(chains.get(SKETCH)).toMatchObject({ streak: 1 });
  });

  test("a long streak shows only its most recent links", () => {
    const chain = streakChains(
      history({ [STRETCH]: daysBefore(LONG_STREAK) }),
      [tracked(STRETCH, true)],
    ).get(STRETCH);
    expect(chain).toEqual({
      streak: LONG_STREAK + 1,
      doneToday: true,
      links: MAX_STREAK_LINKS,
      earned: MAX_STREAK_LINKS - 1,
    });
  });
});

describe("dayGrid", () => {
  test("marks each date done, missed, pending today, or before the task was added", () => {
    const [d1, d2, d3] = ["2026-11-17", "2026-11-18", "2026-11-19"];
    const grid = dayGrid(
      history({ [STRETCH]: [d1, d3], [SKETCH]: [d3] }),
      [
        tracked(STRETCH, false, new Date(`${d1}T09:00:00Z`)),
        tracked(SKETCH, true, new Date(`${d3}T09:00:00Z`)),
      ],
      WEEK,
    );
    expect(grid.dates).toEqual([d1, d2, d3, TODAY]);
    expect(grid.rows).toEqual([
      {
        number: STRETCH,
        text: "Task 1",
        marks: ["done", "missed", "done", "pending"],
      },
      {
        number: SKETCH,
        text: "Task 2",
        marks: ["untracked", "untracked", "done", "done"],
      },
    ]);
  });

  test("shows at most the count of dates, ending today", () => {
    const grid = dayGrid(history({}), [tracked(STRETCH, false)], WEEK);
    expect(grid.dates).toEqual([...daysBefore(WEEK - 1), TODAY]);
  });

  test("with no recurring tasks, shows only today and no rows", () => {
    expect(dayGrid(history({}), [], WEEK)).toEqual({
      dates: [TODAY],
      rows: [],
    });
  });

  test("a task added late in the evening is added on its owner's date", () => {
    const grid = dayGrid(
      { ...history({}), timeZone: "America/Los_Angeles" },
      [tracked(STRETCH, false, new Date(`${TODAY}T03:00:00Z`))],
      WEEK,
    );
    expect(grid.dates.at(0)).toBe("2026-11-19");
    expect(grid.rows[0]?.marks).toEqual(["missed", "pending"]);
  });
});

describe("Home's table", () => {
  test("several quests share the dates up to the newest of their todays", () => {
    expect(sharedDates([], WEEK)).toEqual([]);
    expect(sharedDates(["2026-11-19", TODAY], WEEK)).toEqual([
      ...daysBefore(WEEK - 1),
      TODAY,
    ]);
  });

  test("a date after a quest's today is untracked", () => {
    const rows = markRows(
      history({}),
      [tracked(STRETCH, false)],
      [TODAY, "2026-11-21"],
    );
    expect(rows[0]?.marks).toEqual(["pending", "untracked"]);
  });

  test("a mark today changes the task's own check", () => {
    const tasks = [tracked(STRETCH, false)];
    const before = history({});
    const after = withMark(before, tasks, {
      number: STRETCH,
      date: TODAY,
      done: true,
    });
    expect(after.history).toBe(before);
    expect(after.tasks).toEqual([tracked(STRETCH, true)]);
  });

  test("a mark on an earlier date adds or takes back that day", () => {
    const [d1, d2] = ["2026-11-18", "2026-11-19"];
    const tasks = [tracked(STRETCH, false)];
    const marked = withMark(history({ [STRETCH]: [d2] }), tasks, {
      number: STRETCH,
      date: d1,
      done: true,
    });
    expect(marked.tasks).toBe(tasks);
    expect(marked.history.checkOffs).toEqual([
      { number: STRETCH, dates: [d1, d2] },
    ]);
    expect(
      withMark(marked.history, tasks, {
        number: STRETCH,
        date: d2,
        done: false,
      }).history.checkOffs,
    ).toEqual([{ number: STRETCH, dates: [d1] }]);
  });
});
