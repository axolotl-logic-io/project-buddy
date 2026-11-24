// "use_case_home_tallies": Home's day ledger of tallies, each day's total
// changed in place on the last seven dates, and Increment adding to today's.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { TallyLedger } from "@/components/tally-ledger.tsx";
import {
  incrementTallyAction,
  setTallyDayAction,
} from "@/tallies/tally-actions.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";
import {
  BOOKS,
  BOOKS_ID,
  TALLY_QUEST,
  WORDS,
  WORDS_ID,
} from "../tallies/tally-quest-fixtures.ts";
import {
  LAPTOP_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

function cell(
  tally: string,
  weekday: string,
  day: string,
  total: string,
): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", {
    name: TALLIES_COPY.cell(tally, weekday, day, total),
    exact: true,
  });
}

afterEach(async () => {
  vi.clearAllMocks();
  await setViewport(LAPTOP_VIEWPORT);
});

describe("use_case_home_tallies", () => {
  test("the ledger links each quest and shows each tally's days and total", async () => {
    await render(<TallyLedger quests={[TALLY_QUEST]} />);

    await expect
      .element(page.getByRole("table", { name: TALLIES_COPY.heading }))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: TALLY_QUEST.quest.name }))
      .toHaveAttribute("href", `/quests/${TALLY_QUEST.quest.id}`);
    await expect
      .element(page.getByText(TALLIES_COPY.tallyCount(2)))
      .toBeVisible();
    // Decimal places show only when they aren't 0.
    await expect.element(cell(WORDS, "Tue", "24", "250")).toBeVisible();
    await expect.element(cell(WORDS, "Mon", "23", "1,500.5")).toBeVisible();
    await expect.element(cell(WORDS, "Sat", "21", "-12")).toBeVisible();
    await expect.element(cell(BOOKS, "Tue", "24", "0")).toBeVisible();
    await expect
      .element(page.getByRole("rowheader", { name: WORDS, exact: false }))
      .toHaveTextContent(`${WORDS}${TALLIES_COPY.total} 4,738.5`);
  });

  test("a day's total opens a field that sets it", async () => {
    vi.mocked(setTallyDayAction).mockResolvedValue({
      kind: "saved",
      message: TALLIES_COPY.saved,
    });
    await render(<TallyLedger quests={[TALLY_QUEST]} />);

    await cell(WORDS, "Mon", "23", "1,500.5").click();
    const field = page.getByRole("spinbutton", {
      name: TALLIES_COPY.dayTotal(WORDS, "Mon", "23"),
    });
    await expect.element(field).toHaveDisplayValue("1500.5");
    await field.fill("-3.25");
    await page.getByRole("button", { name: TALLIES_COPY.save }).click();

    await expect
      .poll(() => vi.mocked(setTallyDayAction).mock.calls)
      .toEqual([
        [
          {
            questId: TALLY_QUEST.quest.id,
            id: WORDS_ID,
            date: "2026-11-23",
            total: "-3.25",
          },
        ],
      ]);
    await expect.element(field).not.toBeInTheDocument();
    expect(incrementTallyAction).not.toHaveBeenCalled();
  });

  test("Increment opens a field that adds to today's total", async () => {
    vi.mocked(incrementTallyAction).mockResolvedValue({
      kind: "saved",
      message: TALLIES_COPY.saved,
    });
    await render(<TallyLedger quests={[TALLY_QUEST]} />);

    await page
      .getByRole("button", { name: `${TALLIES_COPY.increment} ${BOOKS}` })
      .click();
    const field = page.getByRole("spinbutton", {
      name: TALLIES_COPY.incrementBy(BOOKS),
    });
    await expect.element(field).toHaveFocus();
    await field.fill("0.5");
    await page.getByRole("button", { name: TALLIES_COPY.add }).click();

    await expect
      .poll(() => vi.mocked(incrementTallyAction).mock.calls)
      .toEqual([
        [{ questId: TALLY_QUEST.quest.id, id: BOOKS_ID, amount: "0.5" }],
      ]);
  });

  test("Escape closes a field without saving, and a refused amount says why", async () => {
    vi.mocked(incrementTallyAction).mockResolvedValue({
      kind: "problem",
      text: TALLIES_COPY.problems["too-large"],
    });
    await render(<TallyLedger quests={[TALLY_QUEST]} />);
    const increment = page.getByRole("button", {
      name: `${TALLIES_COPY.increment} ${WORDS}`,
    });
    const field = page.getByRole("spinbutton", {
      name: TALLIES_COPY.incrementBy(WORDS),
    });

    await increment.click();
    await expect.element(field).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.element(field).not.toBeInTheDocument();

    await increment.click();
    await field.fill("1");
    await page.getByRole("button", { name: TALLIES_COPY.add }).click();
    await expect
      .element(page.getByText(TALLIES_COPY.problems["too-large"]))
      .toBeVisible();
    await expect.element(field).toHaveDisplayValue("1");
  });

  test("on a phone nothing scrolls sideways", async () => {
    await setViewport(PHONE_VIEWPORT);
    await render(<TallyLedger quests={[TALLY_QUEST]} />);

    await expect.element(cell(WORDS, "Tue", "24", "250")).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      PHONE_VIEWPORT.width,
    );
  });

  test("without a tally there is nothing to count yet", async () => {
    await render(<TallyLedger quests={[]} />);

    await expect.element(page.getByText(TALLIES_COPY.noTallies)).toBeVisible();
    await expect.element(page.getByRole("table")).not.toBeInTheDocument();
  });
});
