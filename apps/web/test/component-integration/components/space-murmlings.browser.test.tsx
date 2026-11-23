// "use_case_recurring_tasks" and "use_case_daily_streaks" in
// use-cases/tasks.md, in the browser: a task's menu in a Dailies space makes
// it recurring, and a recurring task shows its streak under its text. What
// the change saves, and how Start Day ends a day, are the server tests'.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SpaceMurmlings } from "@/components/space-murmlings.tsx";
import type { DailiesDay } from "@/dailies/dailies.ts";
import { LOCAL_DATE } from "@/dailies/dailies.ts";
import { MURMLING_ID } from "@/spaces/murmling.ts";
import { changeMurmlingAction } from "@/spaces/murmling-actions.ts";
import type { Murmling } from "@/spaces/murmling-store.ts";
import { SPACE_ID } from "@/spaces/space.ts";
import type { Space } from "@/spaces/space-store.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const QUEST_ID = questIdFixture();
const SPACE: Space = {
  id: SPACE_ID.parse(crypto.randomUUID()),
  position: 0,
  name: "Morning",
  singular: "task",
  plural: "tasks",
  checkOff: "Done",
  uncheck: "Not done",
  newType: "task",
  version: 3,
};
const STRETCH = "Stretch for ten minutes";
const WATER = "Water the plants";

function task(
  text: string,
  taskNumber: number,
  more: Partial<Murmling> = {},
): Murmling {
  return {
    id: MURMLING_ID.parse(crypto.randomUUID()),
    type: "task",
    text,
    taskNumber,
    checkedOff: false,
    recurring: false,
    createdAt: new Date("2026-11-10T08:00:00Z"),
    ...more,
  };
}

// A day that ended with the stretch done or not, and the day still going.
function ended(date: string, done: boolean): DailiesDay {
  return {
    date: LOCAL_DATE.parse(date),
    startedAt: new Date(`${date}T07:00:00Z`),
    tasks: [{ number: 1, text: STRETCH, done }],
  };
}
function going(date: string): DailiesDay {
  return {
    date: LOCAL_DATE.parse(date),
    startedAt: new Date(`${date}T07:00:00Z`),
  };
}

function space(
  contents: readonly Murmling[],
  days?: readonly DailiesDay[],
): React.JSX.Element {
  return (
    <SpaceMurmlings
      questId={QUEST_ID}
      space={SPACE}
      contents={contents}
      destinations={[]}
      days={days}
    />
  );
}

function row(text: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("listitem").filter({ hasText: text });
}

async function openMenu(text: string): Promise<void> {
  await row(text)
    .getByRole("button", { name: SPACES_COPY.actions(SPACE.singular) })
    .click();
}

afterEach(() => {
  vi.mocked(changeMurmlingAction).mockReset();
});

describe("use_case_recurring_tasks", () => {
  test("in Dailies, a task's menu makes it recurring, with Undo, and back to one-off", async () => {
    vi.mocked(changeMurmlingAction).mockResolvedValue({
      kind: "saved",
      message: SPACES_COPY.savedChange,
      undoVersion: SPACE.version + 1,
    });
    const stretch = task(STRETCH, 1);
    const screen = await render(
      space([stretch, task(WATER, 2)], [going("2026-11-20")]),
    );
    await expect
      .element(row(STRETCH).getByRole("img", { name: SPACES_COPY.recurring }))
      .not.toBeInTheDocument();

    await openMenu(STRETCH);
    await page
      .getByRole("menuitem", { name: SPACES_COPY.makeRecurring })
      .click();

    expect(changeMurmlingAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      spaceId: SPACE.id,
      change: { kind: "recurring", id: stretch.id, recurring: true },
    });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(SPACES_COPY.savedChange);
    await expect
      .element(page.getByRole("button", { name: SPACES_COPY.undo }))
      .toBeVisible();

    // The server refreshes the page with the saved task.
    await screen.rerender(
      space(
        [{ ...stretch, recurring: true }, task(WATER, 2)],
        [going("2026-11-20")],
      ),
    );
    await expect
      .element(row(STRETCH).getByRole("img", { name: SPACES_COPY.recurring }))
      .toBeVisible();
    await expect
      .element(row(WATER).getByRole("img", { name: SPACES_COPY.recurring }))
      .not.toBeInTheDocument();

    await openMenu(STRETCH);
    await expect
      .element(page.getByRole("menuitem", { name: SPACES_COPY.makeOneOff }))
      .toBeVisible();
    await page.getByRole("menuitem", { name: SPACES_COPY.makeOneOff }).click();
    expect(changeMurmlingAction).toHaveBeenLastCalledWith({
      questId: QUEST_ID,
      spaceId: SPACE.id,
      change: { kind: "recurring", id: stretch.id, recurring: false },
    });
  });

  test("outside Dailies, a task's menu has no Make recurring", async () => {
    await render(space([task(STRETCH, 1)]));
    await openMenu(STRETCH);
    await expect
      .element(page.getByRole("menuitem", { name: SPACES_COPY.moveUp }))
      .toBeVisible();
    await expect
      .element(page.getByRole("menuitem", { name: SPACES_COPY.makeRecurring }))
      .not.toBeInTheDocument();
  });
});

describe("use_case_daily_streaks", () => {
  test("a recurring task's streak shows under its text and says what checking it off does", async () => {
    const stretch = task(STRETCH, 1, { recurring: true });
    const days = [
      ended("2026-11-16", true),
      ended("2026-11-17", true),
      ended("2026-11-18", true),
      ended("2026-11-19", true),
      going("2026-11-20"),
    ];
    const screen = await render(space([stretch, task(WATER, 2)], days));
    const note = row(STRETCH).getByText(
      "4-day streak. Check it off to make it 5.",
    );
    await expect.element(note).toBeVisible();
    const text = row(STRETCH).getByRole("button", {
      name: SPACES_COPY.editMurmling(SPACE.singular),
    });
    expect(note.element().getBoundingClientRect().top).toBeGreaterThanOrEqual(
      text.element().getBoundingClientRect().bottom,
    );
    // A one-off task has no streak.
    expect(row(WATER).element().textContent).not.toContain("streak");

    // Checked off, the current day counts.
    await screen.rerender(
      space([{ ...stretch, checkedOff: true }, task(WATER, 2)], days),
    );
    await page.getByText(SPACES_COPY.done, { exact: true }).click();
    await expect
      .element(row(STRETCH).getByText("5-day streak.", { exact: true }))
      .toBeVisible();
  });

  test("a missed day or a gap ends the streak, which starts again from the current day", async () => {
    const stretch = task(STRETCH, 1, { recurring: true });
    const screen = await render(
      space(
        [stretch],
        [
          ended("2026-11-17", true),
          ended("2026-11-18", false),
          going("2026-11-19"),
        ],
      ),
    );
    await expect
      .element(row(STRETCH).getByText("Check it off to start a streak."))
      .toBeVisible();
    await screen.rerender(
      space([stretch], [ended("2026-11-17", true), going("2026-11-19")]),
    );
    await expect
      .element(row(STRETCH).getByText("Check it off to start a streak."))
      .toBeVisible();
  });

  test("before the first Start Day, a recurring task shows its repeat icon alone", async () => {
    await render(space([task(STRETCH, 1, { recurring: true })], []));
    await expect
      .element(row(STRETCH).getByRole("img", { name: SPACES_COPY.recurring }))
      .toBeVisible();
    expect(row(STRETCH).element().textContent).not.toContain("streak");
  });
});
