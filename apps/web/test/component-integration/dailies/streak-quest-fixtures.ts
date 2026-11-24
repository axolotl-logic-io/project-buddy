// A Dailies quest's streaks as Home reads them: a week of days with a gap on
// 2026-11-20, a day still going on 2026-11-24, and two recurring tasks, one
// done today and one with a long name.
import type { DailiesDay } from "@/dailies/dailies.ts";
import type { StreakQuest } from "@/dailies/quest-day-store.ts";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const STRETCH = "Stretch for ten minutes";
const SKETCH = "Sketch the fox from three angles, ears first, then the tail";
const STREAK_LIST_ID = LIST_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513");
const STRETCH_ID = LIST_ITEM_ID.parse("5d0f43d4-4b0c-4cb5-9d5c-3a8f3e1c0b21");
const SKETCH_ID = LIST_ITEM_ID.parse("8b2e6f1a-0c4d-4e3b-9a7f-1d2c3b4a5e6f");

// A day on date that ended with the tasks listed done.
function endedOn(date: string, stretch: boolean, sketch: boolean): DailiesDay {
  return {
    date,
    startedAt: new Date(`${date}T08:00:00Z`),
    tasks: [
      { number: 1, text: STRETCH, done: stretch },
      { number: 2, text: SKETCH, done: sketch },
    ],
  };
}

const STREAK_QUEST: StreakQuest = {
  quest: {
    id: questIdFixture("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
    name: "Morning practice",
  },
  days: [
    endedOn("2026-11-18", true, false),
    endedOn("2026-11-19", true, true),
    endedOn("2026-11-21", true, false),
    endedOn("2026-11-22", true, true),
    endedOn("2026-11-23", true, false),
    { date: "2026-11-24", startedAt: new Date("2026-11-24T08:00:00Z") },
  ],
  tasks: {
    items: [
      {
        id: STRETCH_ID,
        listId: STREAK_LIST_ID,
        number: 1,
        text: STRETCH,
        done: true,
        recurring: true,
      },
      {
        id: SKETCH_ID,
        listId: STREAK_LIST_ID,
        number: 2,
        text: SKETCH,
        done: false,
        recurring: true,
      },
    ],
  },
};

export { SKETCH, SKETCH_ID, STREAK_LIST_ID, STREAK_QUEST, STRETCH, STRETCH_ID };
