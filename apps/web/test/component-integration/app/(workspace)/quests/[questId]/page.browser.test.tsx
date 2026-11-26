import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { readNextTasks } from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import { startPerformanceAction } from "@/performances/performance-actions.ts";
import { listPerformances } from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { BUILT_IN_RITES } from "@/rites/rite.ts";
import { listRites } from "@/rites/rite-store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import { DAY_GRID_COPY } from "@/ui/copy/day-grid.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { PERFORMANCE } from "../../../../performances/performance-test-kit.tsx";
import {
  DONE_TASK,
  FOURTH_TASK,
  mockQuestOverview,
  NEXT_TASK,
  OWN_RITE,
  TASKS,
} from "../../../../quests/quest-overview-fixtures.ts";
import {
  SKETCH,
  SKETCH_ID,
} from "../../../../streaks/streak-quest-fixtures.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_QUEST } from "../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/quests/store.ts", () => ({ getQuest: vi.fn() }));
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

const LIST: List = {
  id: LIST_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513"),
  position: 0,
  name: "Bench",
  type: "task",
  version: 0,
};

beforeEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
  signInAs(SIGNED_IN_USER);
  vi.mocked(readLists).mockResolvedValue([LIST]);
  vi.mocked(listQuestPeople).mockResolvedValue(undefined);
  vi.mocked(listPerformances).mockResolvedValue([]);
  vi.mocked(readTaskHistory).mockResolvedValue(HISTORY);
  vi.mocked(readRecurringTasks).mockResolvedValue([]);
  vi.mocked(readNextTasks).mockResolvedValue([]);
  vi.mocked(listRites).mockResolvedValue([]);
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
});

// A quest's check-offs of its stretch: a day missed on 2026-11-14 and
// 2026-11-16, and today, 2026-11-18, with the stretch not done yet.
const STRETCH = "Stretch";
const HISTORY: TaskHistory = {
  today: "2026-11-18",
  timeZone: "UTC",
  checkOffs: [
    {
      number: 1,
      dates: [
        "2026-11-10",
        "2026-11-11",
        "2026-11-12",
        "2026-11-13",
        "2026-11-15",
        "2026-11-17",
      ],
    },
  ],
};

// The quest page with and without an active performance.
const PERFORMANCE_STATES = [
  { name: "with an active performance", performances: [PERFORMANCE] },
  { name: "with no active performance", performances: [] },
] as const;

async function open(quest: Quest, section?: string): Promise<void> {
  vi.mocked(getQuest).mockResolvedValue(quest);
  const params = Promise.resolve({ questId: quest.id });
  const content = await QuestPage({
    params,
    searchParams: Promise.resolve({ section }),
  });
  await render(
    inWorkspace(<QuestLayout params={params}>{content}</QuestLayout>),
  );
}

// The quest panel's link to the quest's settings, named and then hinted.
const SETTINGS_LINK = new RegExp(`^${QUEST_OVERVIEW_COPY.settings}`, "u");
// A card for the list Tasks, named and then sized.
const TASKS_CARD = new RegExp(`^${TASKS.name} `, "u");

test("use_case_open_quest", async () => {
  vi.mocked(listRites).mockResolvedValue([...BUILT_IN_RITES]);
  await open(FOX_QUEST);
  await expect
    .element(page.getByRole("link", { name: `${LIST.name} 0 open` }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=${LIST.id}`);
  await expect
    .element(
      page.getByRole("button", {
        name: QUEST_OVERVIEW_COPY.performRiteOn(LIST.name),
      }),
    )
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: SETTINGS_LINK }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=settings`);
  await expect
    .element(page.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole("textbox", { name: "Message" }))
    .not.toBeInTheDocument();
});

// Holds the list item action's next change unsaved until the returned
// function saves it.
function holdListItemAction(): () => void {
  let finish: (result: QuestActionResult) => void = () => undefined;
  vi.mocked(changeListItemAction)
    .mockReset()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  return (): void => finish({ kind: "saved" });
}

test("use_case_open_quest: a list card checks off its next task and hides it", async () => {
  mockQuestOverview();
  const finish = holdListItemAction();
  await open(FOX_QUEST);
  const card = page.getByRole("region", { name: TASKS_CARD });
  await expect.element(card.getByText("4 open")).toBeVisible();
  await expect
    .element(
      card
        .getByRole("listitem")
        .filter({ hasText: NEXT_TASK.text })
        .getByRole("img", { name: QUEST_SIDEBAR_COPY.nextTask }),
    )
    .toBeVisible();
  await expect.element(card.getByText(DONE_TASK.text)).not.toBeInTheDocument();
  await expect
    .element(card.getByText(FOURTH_TASK.text))
    .not.toBeInTheDocument();
  await expect
    .element(
      card.getByRole("link", { name: QUEST_OVERVIEW_COPY.more(1, TASKS.name) }),
    )
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=${TASKS.id}`);
  await card
    .getByRole("listitem")
    .filter({ hasText: NEXT_TASK.text })
    .getByRole("checkbox", { name: LISTS_COPY.checkOff })
    .click();
  // Until the saved check-off comes back with the page without the task.
  await expect.element(card.getByText(NEXT_TASK.text)).not.toBeInTheDocument();
  await expect.element(card.getByText(FOURTH_TASK.text)).toBeVisible();
  await expect.element(card.getByText("3 open")).toBeVisible();
  expect(changeListItemAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
    listId: TASKS.id,
    change: { kind: "check", id: NEXT_TASK.id, checkedOff: true },
  });
  finish();
});

// Today's heading, with how many of its tasks are left after it.
const TODAY_HEADING = new RegExp(`^${QUEST_OVERVIEW_COPY.today}`, "u");
// The stretch's streak: done today, after a day missed on 2026-11-20.
const STRETCH_STREAK = "4-day streak";

test("use_case_open_quest: Today checks off recurring tasks in place, with their streaks", async () => {
  mockQuestOverview();
  const finish = holdListItemAction();
  await open(FOX_QUEST);
  const today = page.getByRole("region", { name: TODAY_HEADING });
  await expect.element(today.getByText("1 of 2 left")).toBeVisible();
  await expect.element(today.getByText(STRETCH_STREAK)).toBeVisible();
  await today
    .getByRole("listitem")
    .filter({ hasText: SKETCH })
    .getByRole("checkbox", { name: LISTS_COPY.checkOff })
    .click();
  await expect.element(today.getByText("0 of 2 left")).toBeVisible();
  expect(changeListItemAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
    listId: TASKS.id,
    change: { kind: "check", id: SKETCH_ID, checkedOff: true },
  });
  finish();
});

// The rite dialog's choices, named for the rite and then its first message.
const OWN_RITE_CHOICE = new RegExp(`^${OWN_RITE.name}`, "u");
const BRAINSTORM_CHOICE = /^Brainstorm/u;

describe("use_case_perform_rite", () => {
  function riteDialog(): ReturnType<typeof page.getByRole> {
    return page.getByRole("dialog", { name: QUEST_OVERVIEW_COPY.performRite });
  }

  async function openRiteDialog(): Promise<void> {
    mockQuestOverview();
    await open(FOX_QUEST);
    await page
      .getByRole("button", {
        name: QUEST_OVERVIEW_COPY.performRiteOn(TASKS.name),
      })
      .click();
    await vi.waitFor(() => riteDialog().element());
  }

  test("performs the chosen rite on the card's list", async () => {
    vi.mocked(startPerformanceAction).mockReset().mockResolvedValue(undefined);
    await openRiteDialog();
    const dialog = riteDialog();
    await expect
      .element(dialog.getByText(QUEST_OVERVIEW_COPY.rite.on(TASKS.name)))
      .toBeVisible();
    await expect
      .element(
        dialog
          .getByRole("group", { name: QUEST_OVERVIEW_COPY.rite.own })
          .getByRole("radio", { name: OWN_RITE_CHOICE }),
      )
      .toBeVisible();
    await dialog.getByRole("radio", { name: BRAINSTORM_CHOICE }).click();
    await dialog
      .getByRole("button", { name: PERFORMANCE_COPY.start, exact: true })
      .click();
    expect(startPerformanceAction).toHaveBeenLastCalledWith({
      questId: FOX_QUEST.id,
      riteId: "brainstorm",
      listId: TASKS.id,
    });
    await expect.element(dialog).not.toBeInTheDocument();
  });

  test("keeps the dialog open and says why when the performance is refused", async () => {
    vi.mocked(startPerformanceAction)
      .mockReset()
      .mockResolvedValue(PERFORMANCE_COPY.unavailable);
    await openRiteDialog();
    const dialog = riteDialog();
    await dialog
      .getByRole("button", { name: PERFORMANCE_COPY.start, exact: true })
      .click();
    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent(PERFORMANCE_COPY.unavailable);
    await dialog
      .getByRole("button", { name: QUEST_OVERVIEW_COPY.rite.cancel })
      .click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(startPerformanceAction).toHaveBeenCalledOnce();
  });
});

test("use_case_quest_settings", async () => {
  await open(FOX_QUEST, "settings");
  const settings = page.getByRole("region", {
    name: QUEST_OVERVIEW_COPY.settings,
  });
  await expect
    .element(settings.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=days`);
  await expect
    .element(settings.getByRole("button", { name: QUEST_STATUS_COPY.complete }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: QUEST_OVERVIEW_COPY.back }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}`);
});

test("use_case_tailored_quest_overviews", async () => {
  await open({ ...FOX_QUEST, name: "Morning", status: "completed" });
  await expect
    .element(page.getByRole("button", { name: "Start Day" }))
    .not.toBeInTheDocument();
  await open(
    { ...FOX_QUEST, name: "Morning", status: "completed" },
    "settings",
  );
  await expect
    .element(page.getByRole("button", { name: QUEST_STATUS_COPY.restore }))
    .toBeVisible();
});

test("use_case_tasks_panel", async () => {
  await open(FOX_QUEST, LIST.id);
  await expect
    .element(page.getByRole("heading", { name: "Bench" }))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Add task" }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "Back to overview" }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}`);
});

describe("use_case_daily_streaks", () => {
  test("Day grid shows each daily task's last seven days, named for screen readers", async () => {
    vi.mocked(readRecurringTasks).mockResolvedValue([
      {
        id: LIST_ITEM_ID.parse("5d0f43d4-4b0c-4cb5-9d5c-3a8f3e1c0b21"),
        listId: LIST_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513"),
        number: 1,
        text: STRETCH,
        cadence: "daily",
        done: false,
        createdAt: new Date("2026-11-01T09:00:00Z"),
      },
    ]);
    await open(FOX_QUEST, "days");
    const grid = page.getByRole("listitem").filter({ hasText: STRETCH });
    await expect
      .element(page.getByRole("heading", { name: DAY_GRID_COPY.heading }))
      .toBeVisible();
    const days = grid.getByRole("listitem");
    expect(days.elements().map((day) => day.textContent)).toEqual([
      expect.stringContaining("Thu 12 Nov: done"),
      expect.stringContaining("Fri 13 Nov: done"),
      expect.stringContaining("Sat 14 Nov: not done"),
      expect.stringContaining("Sun 15 Nov: done"),
      expect.stringContaining("Mon 16 Nov: not done"),
      expect.stringContaining("Tue 17 Nov: done"),
      expect.stringContaining("Wed 18 Nov: not done yet"),
    ]);
    await expect.element(page.getByText(DAY_GRID_COPY.legend)).toBeVisible();
  });

  test("with no recurring tasks, Day grid says how to make one", async () => {
    await open(FOX_QUEST, "days");
    await expect
      .element(page.getByText(DAY_GRID_COPY.noRecurring))
      .toBeVisible();
  });
});

describe("use_case_timer_quest_panel", () => {
  for (const viewport of [LAPTOP_VIEWPORT, NARROWEST_VIEWPORT]) {
    for (const { name, performances } of PERFORMANCE_STATES) {
      test(`starts in place at ${viewport.width} px, ${name}`, async () => {
        await setViewport(viewport);
        applyTheme("parchment", "dark");
        vi.mocked(listPerformances).mockResolvedValue([...performances]);
        await open(FOX_QUEST);
        expect(
          page
            .getByRole("textbox", { name: PERFORMANCE_COPY.message })
            .elements(),
        ).toHaveLength(performances.length);
        if (viewport === NARROWEST_VIEWPORT) {
          await page
            .getByRole("button", { name: QUEST_OVERVIEW_COPY.panel.expand })
            .click();
        }
        const panel = page.getByRole("dialog", {
          name: QUEST_OVERVIEW_COPY.panel.label,
        });
        await panel.getByLabelText(TIMER_COPY.workLabel).selectOptions("25");
        await panel.getByLabelText(TIMER_COPY.breakLabel).selectOptions("10");
        await panel
          .getByRole("button", { name: TIMER_COPY.start, exact: true })
          .click();
        await expect
          .element(
            panel.getByRole("heading", { name: TIMER_COPY.phase("work") }),
          )
          .toBeVisible();
        await expect
          .element(
            panel.getByRole("timer", { name: TIMER_COPY.remainingLabel }),
          )
          .toBeVisible();
        const nextPhase = panel
          .getByText(TIMER_COPY.nextWithMinutes(TIMER_COPY.next("break"), 10))
          .element()
          .getBoundingClientRect();
        const reset = panel
          .getByRole("button", { name: TIMER_COPY.startAgain })
          .element()
          .getBoundingClientRect();
        expect(nextPhase.bottom).toBeLessThanOrEqual(reset.top);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          viewport.width,
        );
        await panel
          .getByRole("button", { name: QUEST_OVERVIEW_COPY.panel.collapse })
          .click();
        await expect
          .element(page.getByRole("heading", { name: FOX_QUEST.name }))
          .toBeVisible();
      });
    }
  }
});
