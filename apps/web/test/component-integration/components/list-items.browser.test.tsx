// "use_case_recurring_tasks" and "use_case_daily_streaks" in
// use-cases/tasks.md, in the browser: a task's menu in any quest's task list
// makes it recurring, and a recurring task shows its streak under its text.
// What the change saves, and how midnight unchecks a recurring task, are the
// server tests'.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ListItems } from "@/components/list-items.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import type { LocalDate, TaskHistory } from "@/streaks/streaks.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const QUEST_ID = questIdFixture();
const LIST: List = {
  id: LIST_ID.parse(crypto.randomUUID()),
  position: 0,
  name: "Morning",
  checkOff: "Done",
  uncheck: "Not done",
  type: "task",
  version: 3,
};
const STRETCH = "Stretch for ten minutes";
const WATER = "Water the plants";

function task(
  text: string,
  taskNumber: number,
  more: Partial<ListItem> = {},
): ListItem {
  return {
    id: LIST_ITEM_ID.parse(crypto.randomUUID()),
    text,
    taskNumber,
    checkedOff: false,
    recurring: false,
    createdAt: new Date("2026-11-10T08:00:00Z"),
    ...more,
  };
}

const TODAY = "2026-11-20";

// The quest's history, with the dates someone checked the stretch off.
function history(stretchDates: readonly LocalDate[] = []): TaskHistory {
  return {
    today: TODAY,
    timeZone: "UTC",
    checkOffs: [{ number: 1, dates: stretchDates }],
  };
}

function list(
  contents: readonly ListItem[],
  checkOffs?: TaskHistory,
  shown: List = LIST,
): React.JSX.Element {
  return (
    <ListItems
      questId={QUEST_ID}
      list={shown}
      contents={contents}
      destinations={[]}
      history={checkOffs}
    />
  );
}

function row(text: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("listitem").filter({ hasText: text });
}

async function openMenu(text: string): Promise<void> {
  await row(text)
    .getByRole("button", { name: LISTS_COPY.actions(LIST.type) })
    .click();
}

afterEach(() => {
  vi.mocked(changeListItemAction).mockReset();
});

describe("use_case_recurring_tasks", () => {
  test("a task's menu makes it recurring, with Undo, and back to one-off", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({
      kind: "saved",
      message: LISTS_COPY.savedChange,
      undoVersion: LIST.version + 1,
    });
    const stretch = task(STRETCH, 1);
    const screen = await render(list([stretch, task(WATER, 2)], history()));
    await expect
      .element(row(STRETCH).getByRole("img", { name: LISTS_COPY.recurring }))
      .not.toBeInTheDocument();

    await openMenu(STRETCH);
    await page
      .getByRole("menuitem", { name: LISTS_COPY.makeRecurring })
      .click();

    expect(changeListItemAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      listId: LIST.id,
      change: { kind: "recurring", id: stretch.id, recurring: true },
    });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(LISTS_COPY.savedChange);
    await expect
      .element(page.getByRole("button", { name: LISTS_COPY.undo }))
      .toBeVisible();

    // The server refreshes the page with the saved task.
    await screen.rerender(
      list([{ ...stretch, recurring: true }, task(WATER, 2)], history()),
    );
    await expect
      .element(row(STRETCH).getByRole("img", { name: LISTS_COPY.recurring }))
      .toBeVisible();
    await expect
      .element(row(WATER).getByRole("img", { name: LISTS_COPY.recurring }))
      .not.toBeInTheDocument();

    await openMenu(STRETCH);
    await expect
      .element(page.getByRole("menuitem", { name: LISTS_COPY.makeOneOff }))
      .toBeVisible();
    await page.getByRole("menuitem", { name: LISTS_COPY.makeOneOff }).click();
    expect(changeListItemAction).toHaveBeenLastCalledWith({
      questId: QUEST_ID,
      listId: LIST.id,
      change: { kind: "recurring", id: stretch.id, recurring: false },
    });
  });

  test("a list other than a task list has no Make recurring", async () => {
    await render(
      list([task(STRETCH, 1, { taskNumber: null })], undefined, {
        ...LIST,
        type: "plain",
      }),
    );
    await row(STRETCH)
      .getByRole("button", { name: LISTS_COPY.actions("plain") })
      .click();
    await expect
      .element(page.getByRole("menuitem", { name: LISTS_COPY.moveUp }))
      .toBeVisible();
    await expect
      .element(page.getByRole("menuitem", { name: LISTS_COPY.makeRecurring }))
      .not.toBeInTheDocument();
  });
});

describe("use_case_daily_streaks", () => {
  test("a recurring task's streak shows under its text and says what checking it off does", async () => {
    const stretch = task(STRETCH, 1, { recurring: true });
    const days = history([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
    ]);
    const screen = await render(list([stretch, task(WATER, 2)], days));
    const note = row(STRETCH).getByText(
      "4-day streak. Check it off to make it 5.",
    );
    await expect.element(note).toBeVisible();
    const text = row(STRETCH).getByRole("button", {
      name: LISTS_COPY.editListItem(LIST.type),
    });
    expect(note.element().getBoundingClientRect().top).toBeGreaterThanOrEqual(
      text.element().getBoundingClientRect().bottom,
    );
    // A one-off task has no streak.
    expect(row(WATER).element().textContent).not.toContain("streak");

    // Checked off, the current day counts.
    await screen.rerender(
      list([{ ...stretch, checkedOff: true }, task(WATER, 2)], days),
    );
    await page.getByText(LISTS_COPY.done, { exact: true }).click();
    await expect
      .element(row(STRETCH).getByText("5-day streak.", { exact: true }))
      .toBeVisible();
  });

  test("a missed day ends the streak, which starts again from today", async () => {
    const stretch = task(STRETCH, 1, { recurring: true });
    await render(list([stretch], history(["2026-11-17", "2026-11-18"])));
    await expect
      .element(row(STRETCH).getByText("Check it off to start a streak."))
      .toBeVisible();
  });

  test("checked off yesterday, the streak counts it until today's is done", async () => {
    const stretch = task(STRETCH, 1, { recurring: true });
    await render(list([stretch], history(["2026-11-18", "2026-11-19"])));
    await expect
      .element(
        row(STRETCH).getByText("2-day streak. Check it off to make it 3."),
      )
      .toBeVisible();
  });

  test("without a history, a recurring task shows its repeat icon alone", async () => {
    await render(list([task(STRETCH, 1, { recurring: true })]));
    await expect
      .element(row(STRETCH).getByRole("img", { name: LISTS_COPY.recurring }))
      .toBeVisible();
    expect(row(STRETCH).element().textContent).not.toContain("streak");
  });
});
