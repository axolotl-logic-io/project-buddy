// "use_case_home_streaks": Home's table of streaks, checked off in place on
// any day that was started.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { StreakTable } from "@/components/dailies/streak-table.tsx";
import { changeQuestDay } from "@/dailies/quest-day-actions.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import {
  SKETCH,
  SKETCH_ID,
  STREAK_LIST_ID,
  STREAK_QUEST,
  STRETCH,
} from "../../dailies/streak-quest-fixtures.ts";

function square(
  task: string,
  weekday: string,
  day: string,
): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", {
    name: HOME_COPY.square(task, weekday, day),
    exact: true,
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_home_streaks", () => {
  test("the table links each quest and shows each task's week and streak", async () => {
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    const table = page.getByRole("table", { name: HOME_COPY.streaksHeading });
    await expect.element(table).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: STREAK_QUEST.quest.name }))
      .toHaveAttribute("href", `/quests/${STREAK_QUEST.quest.id}`);
    await expect
      .element(page.getByRole("rowheader", { name: STRETCH }))
      .toBeVisible();
    await expect
      .element(square(STRETCH, "Tue", "24"))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(square(SKETCH, "Mon", "23"))
      .toHaveAttribute("aria-pressed", "false");
    // No day was started on Friday the 20th, so its squares only show the gap.
    await expect.element(square(STRETCH, "Fri", "20")).not.toBeInTheDocument();
    const stretchRow = page.getByRole("row", { name: STRETCH, exact: false });
    await expect
      .element(stretchRow.getByRole("cell").last())
      .toHaveTextContent("4days");
  });

  test("a square on the day still going checks the task itself", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({ kind: "saved" });
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    await square(SKETCH, "Tue", "24").click();

    await expect
      .poll(() => vi.mocked(changeListItemAction).mock.calls)
      .toEqual([
        [
          {
            questId: STREAK_QUEST.quest.id,
            listId: STREAK_LIST_ID,
            change: { kind: "check", id: SKETCH_ID, checkedOff: true },
          },
        ],
      ]);
    expect(changeQuestDay).not.toHaveBeenCalled();
  });

  test("a square on an earlier day changes what that day recorded", async () => {
    vi.mocked(changeQuestDay).mockResolvedValue({ kind: "saved" });
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    await square(SKETCH, "Mon", "23").click();

    await expect
      .poll(() => vi.mocked(changeQuestDay).mock.calls)
      .toEqual([
        [
          {
            op: "mark",
            questId: STREAK_QUEST.quest.id,
            localDate: "2026-11-23",
            number: 2,
            done: true,
          },
        ],
      ]);
    expect(changeListItemAction).not.toHaveBeenCalled();
  });

  test("a day that can't be changed says so", async () => {
    vi.mocked(changeQuestDay).mockResolvedValue({
      kind: "problem",
      text: HOME_COPY.markUnavailable,
    });
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    await square(STRETCH, "Wed", "18").click();

    await expect
      .element(page.getByText(HOME_COPY.markUnavailable))
      .toBeVisible();
  });

  test("without a recurring task there is nothing to count yet", async () => {
    await render(<StreakTable quests={[]} />);

    await expect.element(page.getByText(HOME_COPY.noStreaks)).toBeVisible();
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
  });
});
