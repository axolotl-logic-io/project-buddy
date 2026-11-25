// "use_case_life" in use-cases/quests.md: Life pinned on Quests, with how
// many of its recurring tasks are done today and one of them, picked at
// random, to check off where it is suggested.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LifePin } from "@/components/life-pin.tsx";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { LifeSummary, SuggestedTask } from "@/quests/quest-index-store.ts";
import type { Cadence } from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { LIFE_COPY } from "@/ui/copy/quests.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const LIFE_ID = questIdFixture();
// Life's recurring tasks, how many are done today, and a streak.
const RECURRING = 5;
const DONE = 3;
const STREAK_WEEKS = 12;
const LIST = LIST_ID.parse(crypto.randomUUID());

function recurring(
  text: string,
  streak = 0,
  cadence: Cadence = "daily",
): SuggestedTask {
  return {
    id: LIST_ITEM_ID.parse(crypto.randomUUID()),
    listId: LIST,
    text,
    cadence,
    streak,
  };
}

const STRETCH = recurring("Stretch", STREAK_WEEKS, "weekly");
const READ = recurring("Read a chapter");

function life(
  waiting: readonly SuggestedTask[],
  suggestion: SuggestedTask | undefined,
  doneNow = DONE,
): LifeSummary {
  return {
    quest: { id: LIFE_ID, name: "Life" },
    recurring: RECURRING,
    doneNow,
    waiting,
    suggestion,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_life", () => {
  test("shows today's progress, a way into Life and only the suggested task", async () => {
    await render(<LifePin life={life([STRETCH, READ], STRETCH)} />);
    const pin = page.getByRole("region", { name: "Life" });
    await expect
      .element(pin.getByText(LIFE_COPY.progress(DONE, RECURRING)))
      .toBeVisible();
    await expect
      .element(pin.getByRole("link", { name: LIFE_COPY.openLabel("Life") }))
      .toHaveAttribute("href", `/quests/${LIFE_ID}`);
    await expect
      .element(pin.getByRole("checkbox", { name: STRETCH.text }))
      .not.toBeChecked();
    await expect
      .element(
        pin.getByText(
          `${CADENCE_COPY.repeats("weekly")} · ${CADENCE_COPY.streak("weekly", STREAK_WEEKS)}`,
        ),
      )
      .toBeVisible();
    expect(pin.getByRole("checkbox").elements()).toHaveLength(1);
  });

  test("checking the suggestion off checks it off in Life and counts it", async () => {
    const saved = Promise.withResolvers<QuestActionResult>();
    vi.mocked(changeListItemAction).mockReturnValue(saved.promise);
    await render(<LifePin life={life([STRETCH, READ], STRETCH)} />);
    const box = page.getByRole("checkbox", { name: STRETCH.text });
    await box.click();
    await expect.element(box).toBeChecked();
    await expect
      .element(page.getByText(LIFE_COPY.progress(DONE + 1, RECURRING)))
      .toBeVisible();
    expect(changeListItemAction).toHaveBeenCalledWith({
      questId: LIFE_ID,
      listId: LIST,
      change: { kind: "check", id: STRETCH.id, checkedOff: true },
    });
    saved.resolve({ kind: "saved" });
  });

  test("the suggestion holds while it waits, however the page refreshes", async () => {
    const view = await render(
      <LifePin life={life([STRETCH, READ], STRETCH)} />,
    );
    await view.rerender(<LifePin life={life([STRETCH, READ], READ)} />);
    await expect
      .element(page.getByRole("checkbox", { name: STRETCH.text }))
      .toBeVisible();
    await view.rerender(<LifePin life={life([READ], READ, DONE + 1)} />);
    await expect
      .element(page.getByRole("checkbox", { name: READ.text }))
      .toBeVisible();
    await expect
      .element(page.getByText(LIFE_COPY.progress(DONE + 1, RECURRING)))
      .toBeVisible();
  });

  test("with every recurring task done, suggests none", async () => {
    await render(<LifePin life={life([], undefined, RECURRING)} />);
    await expect
      .element(page.getByText(LIFE_COPY.progress(RECURRING, RECURRING)))
      .toBeVisible();
    await expect
      .element(page.getByText(LIFE_COPY.suggested))
      .not.toBeInTheDocument();
  });
});
