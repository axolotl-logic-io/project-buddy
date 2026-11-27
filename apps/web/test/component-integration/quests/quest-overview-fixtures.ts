// A quest's overview as the quest page reads it: a task list, Tasks, with
// four open one-off tasks, one checked off and STREAK_QUEST's two recurring
// tasks, and a list of quick notes, Phrases, with one note. The first open
// task is the next task. The user has the built-in rites and one of their
// own. mockQuestOverview has the mocked stores answer with them.
import { vi } from "vitest";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import {
  type ListItem,
  readListItems,
  readNextTasks,
} from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import { BUILT_IN_RITES, type Rite } from "@/rites/rite.ts";
import { listRites } from "@/rites/rite-store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import {
  STREAK_LIST_ID,
  STREAK_QUEST,
} from "../streaks/streak-quest-fixtures.ts";

const TASKS: List = {
  id: STREAK_LIST_ID,
  position: 0,
  name: "Tasks",
  type: "task",
  version: 0,
};

const PHRASES: List = {
  id: LIST_ID.parse("c4d2e1f0-7a6b-4c5d-8e9f-0a1b2c3d4e5f"),
  position: 1,
  name: "Phrases",
  type: "quick-note",
  version: 0,
};

const ADDED = new Date("2026-11-20T09:00:00Z");
// The one-off tasks' numbers count on from the recurring tasks'.
let lastTaskNumber: number = STREAK_QUEST.tasks.length;

function item(id: string, text: string, checkedOff = false): ListItem {
  return {
    id: LIST_ITEM_ID.parse(id),
    text,
    taskNumber: null,
    checkedOff,
    recurring: false,
    cadence: "daily",
    createdAt: ADDED,
  };
}

function task(id: string, text: string, checkedOff = false): ListItem {
  lastTaskNumber += 1;
  return { ...item(id, text, checkedOff), taskNumber: lastTaskNumber };
}

const NEXT_TASK = task(
  "e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b51",
  "Book the conversation class",
);
const SECOND_TASK = task(
  "e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b52",
  "Write a postcard to Lucía about the market, the rain and the long bus ride home",
);
const THIRD_TASK = task(
  "e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b53",
  "Learn the subjunctive",
);
const FOURTH_TASK = task(
  "e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b54",
  "Watch a film without subtitles",
);
const DONE_TASK = task(
  "e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b55",
  "Buy a dictionary",
  true,
);

const RECURRING_ITEMS: readonly ListItem[] = STREAK_QUEST.tasks.map(
  ({ id, text, number, done, cadence, createdAt }) => ({
    id,
    text,
    taskNumber: number,
    checkedOff: done,
    recurring: true,
    cadence,
    createdAt,
  }),
);

const TASK_ITEMS: readonly ListItem[] = [
  ...RECURRING_ITEMS,
  NEXT_TASK,
  SECOND_TASK,
  THIRD_TASK,
  FOURTH_TASK,
  DONE_TASK,
];

const PHRASE = item(
  "f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b",
  "¿Me pones un café con leche?",
);

const OWN_RITE: Rite = {
  id: "0b8e2f4a-6c1d-4e3f-9a5b-7c8d9e0f1a2b",
  source: "own",
  name: "Weekly review",
  firstMessage: "What did {list} teach you this week?",
  replies: ["What else?"],
  order: "random",
  loop: true,
  finalReply: "",
};

const RITES: readonly Rite[] = [...BUILT_IN_RITES, OWN_RITE];

function mockQuestOverview(): void {
  vi.mocked(readLists).mockResolvedValue([TASKS, PHRASES]);
  vi.mocked(readListItems).mockImplementation((_user, _quest, listId) => {
    if (listId === TASKS.id) {
      return Promise.resolve([...TASK_ITEMS]);
    }
    if (listId === PHRASES.id) {
      return Promise.resolve([PHRASE]);
    }
    return Promise.resolve([]);
  });
  vi.mocked(readNextTasks).mockResolvedValue([
    { ...NEXT_TASK, listId: TASKS.id },
  ]);
  vi.mocked(readRecurringTasks).mockResolvedValue([...STREAK_QUEST.tasks]);
  vi.mocked(readTaskHistory).mockResolvedValue(STREAK_QUEST.history);
  vi.mocked(listRites).mockResolvedValue([...RITES]);
}

export {
  DONE_TASK,
  FOURTH_TASK,
  mockQuestOverview,
  NEXT_TASK,
  OWN_RITE,
  PHRASE,
  PHRASES,
  RITES,
  SECOND_TASK,
  TASKS,
  THIRD_TASK,
};
