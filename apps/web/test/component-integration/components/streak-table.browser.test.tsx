// "use_case_home_streaks": Home's tables of streaks, one for each cadence,
// checked off in place in any of the last seven periods since a task was
// added.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { StreakTable } from "@/components/streak-table.tsx";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { markTaskPeriodAction } from "@/streaks/streak-actions.ts";
import type { StreakQuest } from "@/streaks/streak-store.ts";
import { CADENCES } from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";
import {
  SKETCH,
  SKETCH_ID,
  STREAK_LIST_ID,
  STREAK_QUEST,
  STRETCH,
} from "../streaks/streak-quest-fixtures.ts";

const CALL = "Call grandma";
const REVIEW = "Review the budget";

// The quest with a weekly and a monthly task in place of its daily ones.
// Its today is Tuesday 24 November, in the week from Monday the 23rd.
const LONGER_QUEST: StreakQuest = {
  quest: {
    id: questIdFixture("9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d"),
    name: "Family",
  },
  history: {
    ...STREAK_QUEST.history,
    checkOffs: [
      { number: 3, dates: ["2026-11-12", "2026-11-20"] },
      { number: 4, dates: ["2026-10-31"] },
    ],
  },
  tasks: [
    {
      id: LIST_ITEM_ID.parse("2f0b8a64-6d1e-4c3a-9b7d-5e4f3a2b1c0d"),
      listId: STREAK_LIST_ID,
      number: 3,
      text: CALL,
      cadence: "weekly",
      done: false,
      createdAt: new Date("2026-10-01T09:00:00Z"),
    },
    {
      id: LIST_ITEM_ID.parse("7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f"),
      listId: STREAK_LIST_ID,
      number: 4,
      text: REVIEW,
      cadence: "monthly",
      done: true,
      createdAt: new Date("2026-09-15T09:00:00Z"),
    },
  ],
};

function square(
  task: string,
  period: string,
): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", {
    name: HOME_COPY.square(task, period),
    exact: true,
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_home_streaks", () => {
  test("the table links each quest and shows each task's week and streak", async () => {
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    const table = page.getByRole("table", {
      name: CADENCE_COPY.words("daily").heading,
    });
    await expect.element(table).toBeVisible();
    // A cadence without a recurring task has no table.
    await expect
      .element(
        page.getByRole("table", { name: CADENCE_COPY.words("weekly").heading }),
      )
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: STREAK_QUEST.quest.name }))
      .toHaveAttribute("href", `/quests/${STREAK_QUEST.quest.id}`);
    await expect
      .element(page.getByRole("rowheader", { name: STRETCH }))
      .toBeVisible();
    await expect
      .element(square(STRETCH, "Tue 24 Nov"))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(square(SKETCH, "Mon 23 Nov"))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(square(STRETCH, "Fri 20 Nov"))
      .toHaveAttribute("aria-pressed", "false");
    // Sketch was added on Thursday the 19th, so Wednesday only shows it was
    // not added yet.
    await expect.element(square(SKETCH, "Wed 18 Nov")).not.toBeInTheDocument();
    const stretchRow = page.getByRole("row", { name: STRETCH, exact: false });
    await expect
      .element(stretchRow.getByRole("cell").last())
      .toHaveTextContent("4days");
  });

  test("a square on the day still going checks the task itself", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({ kind: "saved" });
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    await square(SKETCH, "Tue 24 Nov").click();

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
    expect(markTaskPeriodAction).not.toHaveBeenCalled();
  });

  test("a square on an earlier date marks that day's check-off", async () => {
    vi.mocked(markTaskPeriodAction).mockResolvedValue({ kind: "saved" });
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    await square(SKETCH, "Mon 23 Nov").click();

    await expect
      .poll(() => vi.mocked(markTaskPeriodAction).mock.calls)
      .toEqual([
        [
          {
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
    vi.mocked(markTaskPeriodAction).mockResolvedValue({
      kind: "problem",
      text: HOME_COPY.markUnavailable,
    });
    await render(<StreakTable quests={[STREAK_QUEST]} />);

    await square(STRETCH, "Wed 18 Nov").click();

    await expect
      .element(page.getByText(HOME_COPY.markUnavailable))
      .toBeVisible();
  });

  test("weekly and monthly tasks have their own tables, by week and by month", async () => {
    vi.mocked(markTaskPeriodAction).mockResolvedValue({ kind: "saved" });
    await render(<StreakTable quests={[STREAK_QUEST, LONGER_QUEST]} />);

    expect(
      page
        .getByRole("table")
        .elements()
        .map((table) => table.getAttribute("aria-labelledby"))
        .map((id) => document.querySelector(`[id="${id}"]`)?.textContent),
    ).toEqual(CADENCES.map((cadence) => CADENCE_COPY.words(cadence).heading));
    await expect
      .element(page.getByText(CADENCE_COPY.words("weekly").starts))
      .toBeVisible();
    const weeks = page.getByRole("table", {
      name: CADENCE_COPY.words("weekly").heading,
    });
    await expect
      .element(
        weeks.getByRole("columnheader", { name: "Mon 23 Nov", exact: true }),
      )
      .toBeVisible();
    await expect
      .element(weeks.getByText(HOME_COPY.recurringCount(1, "weekly")))
      .toBeVisible();
    const call = page.getByRole("row", { name: CALL, exact: false });
    await expect
      .element(call.getByRole("cell").last())
      .toHaveTextContent("2weeks");
    await expect
      .element(square(CALL, "week of Mon 16 Nov"))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(square(CALL, "week of Mon 23 Nov"))
      .toHaveAttribute("aria-pressed", "false");
    // Added on 15 September, so it has squares from September on.
    await expect
      .element(square(REVIEW, "October 2026"))
      .toHaveAttribute("aria-pressed", "true");
    await expect.element(square(REVIEW, "August 2026")).not.toBeInTheDocument();
    const review = page.getByRole("row", { name: REVIEW, exact: false });
    await expect
      .element(review.getByRole("cell").last())
      .toHaveTextContent("2months");

    await square(CALL, "week of Mon 9 Nov").click();

    await expect
      .poll(() => vi.mocked(markTaskPeriodAction).mock.calls)
      .toEqual([
        [
          {
            questId: LONGER_QUEST.quest.id,
            localDate: "2026-11-09",
            number: 3,
            done: false,
          },
        ],
      ]);
    expect(changeListItemAction).not.toHaveBeenCalled();
  });

  test("without a recurring task there is nothing to count yet", async () => {
    await render(<StreakTable quests={[]} />);

    await expect.element(page.getByText(HOME_COPY.noStreaks)).toBeVisible();
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
  });
});
