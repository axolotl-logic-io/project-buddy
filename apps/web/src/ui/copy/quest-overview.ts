import type { ListType } from "@/lists/list.ts";
import type { StreakChain } from "@/streaks/streaks.ts";
import { LISTS_COPY } from "./lists.ts";

const QUEST_OVERVIEW_COPY = {
  back: "Back to overview",
  quest: "Quest",
  status: "Quest status",
  private: "Private",
  // The open tasks that follow the next task.
  followedBy: (tasks: readonly string[]): string =>
    `Then: ${tasks.join(" · ")}`,
  today: "Today",
  // A recurring task's streak beside it under Today, and whether checking
  // it off today keeps the streak going.
  streak: ({ streak, doneToday }: StreakChain): string => {
    if (streak === 0) {
      return "No streak yet";
    }
    if (doneToday) {
      return `${streak}-day streak`;
    }
    return `${streak}-day streak · keep it going`;
  },
  performRite: "Perform a rite",
  settings: "Quest settings",
  members: (count: number): string => `Members (${count})`,
  // A list's size beside its name: a task list counts its open tasks, and
  // any other list counts all its items.
  listSize: (
    type: ListType,
    { total, open }: { readonly total: number; readonly open: number },
  ): string => {
    if (type === "task") {
      return `${open} open`;
    }
    const { one, many } = LISTS_COPY.nouns(type);
    if (total === 1) {
      return `1 ${one}`;
    }
    return `${total} ${many}`;
  },
};

export { QUEST_OVERVIEW_COPY };
