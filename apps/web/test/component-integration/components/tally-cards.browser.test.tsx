// "use_case_tally_lists" in the browser: a tally list shows each tally as a
// counter card, with Increment and Edit today each opening a number field.
// What they save is the server tests'.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ListItems } from "@/components/list-items.tsx";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import { TALLY_DAYS } from "@/tallies/tally.ts";
import {
  incrementTallyAction,
  setTallyDayAction,
} from "@/tallies/tally-actions.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";
import {
  BOOKS,
  TALLY_LIST_ID,
  TALLY_QUEST,
  WORDS,
  WORDS_ID,
} from "../tallies/tally-quest-fixtures.ts";

const LIST: List = {
  id: TALLY_LIST_ID,
  position: 1,
  name: "Counts",
  type: "tally",
  version: 2,
};

const CONTENTS: readonly ListItem[] = TALLY_QUEST.tallies.map(
  ({ id, text }) => ({
    id,
    text,
    taskNumber: null,
    checkedOff: false,
    recurring: false,
    cadence: "daily",
    createdAt: new Date("2026-11-10T08:00:00Z"),
  }),
);

function card(text: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("listitem").filter({ hasText: text }).first();
}

async function renderList(): Promise<void> {
  await render(
    <ListItems
      questId={TALLY_QUEST.quest.id}
      list={LIST}
      contents={CONTENTS}
      destinations={[]}
      tallies={TALLY_QUEST}
    />,
  );
}

// Holds the action's next reply until the returned function gives it.
function hold(
  action: typeof incrementTallyAction | typeof setTallyDayAction,
): (result: QuestActionResult) => void {
  let answer: (result: QuestActionResult) => void = () => undefined;
  vi.mocked(action).mockImplementationOnce(
    () =>
      new Promise<QuestActionResult>((resolve) => {
        answer = resolve;
      }),
  );
  return (result: QuestActionResult): void => answer(result);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_tally_lists", () => {
  test("each tally is a card with today's total, its last seven days and its total", async () => {
    await renderList();

    const words = card(WORDS);
    await expect
      .element(words.getByText(TALLIES_COPY.today, { exact: true }))
      .toBeVisible();
    await expect.element(words.getByText("250", { exact: true })).toBeVisible();
    await expect
      .element(words.getByText("4,738.5", { exact: true }))
      .toBeVisible();
    const days = words.getByRole("list", { name: TALLIES_COPY.recentDays });
    await expect.element(days).toBeVisible();
    expect(days.getByRole("listitem").elements()).toHaveLength(TALLY_DAYS);
    await expect
      .element(days.getByText(TALLIES_COPY.day("Mon", "23", "1,500.5")))
      .toBeInTheDocument();
    await expect
      .element(days.getByText(TALLIES_COPY.day("Sat", "21", "-12")))
      .toBeInTheDocument();
    await expect
      .element(card(BOOKS).getByText("0", { exact: true }).first())
      .toBeVisible();
    // A tally has no check-off and can't be made recurring.
    await expect.element(page.getByRole("checkbox")).not.toBeInTheDocument();
    await words
      .getByRole("button", { name: LISTS_COPY.actions("tally") })
      .click();
    await expect
      .element(
        page.getByRole("menuitem", {
          name: LISTS_COPY.removeListItem("tally"),
        }),
      )
      .toBeVisible();
    await expect
      .element(
        page.getByRole("menuitem", { name: CADENCE_COPY.repeat("daily") }),
      )
      .not.toBeInTheDocument();
  });

  test("Increment gives a number field that adds the amount to today's, shown before the server replies", async () => {
    const answer = hold(incrementTallyAction);
    await renderList();

    await card(WORDS)
      .getByRole("button", { name: TALLIES_COPY.increment })
      .click();
    const field = page.getByRole("spinbutton", {
      name: TALLIES_COPY.incrementBy(WORDS),
    });
    await expect.element(field).toHaveFocus();
    await field.fill("-2.75");
    await card(WORDS).getByRole("button", { name: TALLIES_COPY.add }).click();

    await expect
      .poll(() => vi.mocked(incrementTallyAction).mock.calls)
      .toEqual([
        [{ questId: TALLY_QUEST.quest.id, id: WORDS_ID, amount: "-2.75" }],
      ]);
    await expect.element(field).not.toBeInTheDocument();
    await expect
      .element(card(WORDS).getByText("247.25", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(TALLIES_COPY.saved);

    answer({ kind: "saved" });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(TALLIES_COPY.saved);
  });

  test("Edit today gives today's total to change, and a refusal puts it back and opens the field again with the new total", async () => {
    const answer = hold(setTallyDayAction);
    await renderList();

    await card(WORDS)
      .getByRole("button", { name: TALLIES_COPY.editToday })
      .click();
    const field = page.getByRole("spinbutton", {
      name: TALLIES_COPY.todayTotal(WORDS),
    });
    await expect.element(field).toHaveDisplayValue("250");
    await field.fill("300.5");
    await page.getByRole("button", { name: TALLIES_COPY.save }).click();

    await expect
      .poll(() => vi.mocked(setTallyDayAction).mock.calls)
      .toEqual([
        [
          {
            questId: TALLY_QUEST.quest.id,
            id: WORDS_ID,
            date: TALLY_QUEST.today,
            total: "300.5",
          },
        ],
      ]);
    await expect.element(field).not.toBeInTheDocument();
    await expect
      .element(card(WORDS).getByText("300.5", { exact: true }))
      .toBeVisible();

    answer({ kind: "problem", text: LISTS_COPY.saveFailed });

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(LISTS_COPY.saveFailed);
    await expect.element(field).toHaveDisplayValue("300.5");
    await expect
      .element(card(WORDS).getByText("250", { exact: true }))
      .toBeVisible();
    await expect.element(page.getByRole("status")).toHaveTextContent("");
  });

  test("a number a tally can't hold is refused with the reason, and Cancel closes the field", async () => {
    await renderList();

    await card(WORDS)
      .getByRole("button", { name: TALLIES_COPY.increment })
      .click();
    const field = page.getByRole("spinbutton", {
      name: TALLIES_COPY.incrementBy(WORDS),
    });
    await field.fill("1.1234567");
    await card(WORDS).getByRole("button", { name: TALLIES_COPY.add }).click();

    await expect
      .element(page.getByText(TALLIES_COPY.problems["invalid-amount"]))
      .toBeVisible();
    await expect.element(field).toHaveDisplayValue("1.1234567");
    expect(incrementTallyAction).not.toHaveBeenCalled();
    await page.getByRole("button", { name: TALLIES_COPY.cancel }).click();
    await expect.element(field).not.toBeInTheDocument();
  });
});
