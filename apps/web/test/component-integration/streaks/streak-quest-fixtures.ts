// A quest's streaks as Home reads them: today is 2026-11-24 in UTC, and two
// recurring tasks, one done today and one with a long name, added on
// 2026-11-19, so earlier dates are untracked for it.
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import type { StreakQuest } from "@/streaks/streak-store.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const STRETCH = "Stretch for ten minutes";
const SKETCH = "Sketch the fox from three angles, ears first, then the tail";
const STREAK_LIST_ID = LIST_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513");
const STRETCH_ID = LIST_ITEM_ID.parse("5d0f43d4-4b0c-4cb5-9d5c-3a8f3e1c0b21");
const SKETCH_ID = LIST_ITEM_ID.parse("8b2e6f1a-0c4d-4e3b-9a7f-1d2c3b4a5e6f");

const STREAK_QUEST: StreakQuest = {
  quest: {
    id: questIdFixture("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
    name: "Morning practice",
  },
  history: {
    today: "2026-11-24",
    timeZone: "UTC",
    checkOffs: [
      {
        number: 1,
        dates: [
          "2026-11-18",
          "2026-11-19",
          "2026-11-21",
          "2026-11-22",
          "2026-11-23",
        ],
      },
      { number: 2, dates: ["2026-11-19", "2026-11-22"] },
    ],
  },
  tasks: [
    {
      id: STRETCH_ID,
      listId: STREAK_LIST_ID,
      number: 1,
      text: STRETCH,
      done: true,
      createdAt: new Date("2026-11-01T09:00:00Z"),
    },
    {
      id: SKETCH_ID,
      listId: STREAK_LIST_ID,
      number: 2,
      text: SKETCH,
      done: false,
      createdAt: new Date("2026-11-19T09:00:00Z"),
    },
  ],
};

export { SKETCH, SKETCH_ID, STREAK_LIST_ID, STREAK_QUEST, STRETCH };
