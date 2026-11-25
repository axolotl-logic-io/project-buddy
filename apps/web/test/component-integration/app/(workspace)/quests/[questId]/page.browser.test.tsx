import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { type OpenTask, readNextTasks } from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import { listPerformances } from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import { DAY_GRID_COPY } from "@/ui/copy/day-grid.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { PERFORMANCE } from "../../../../performances/performance-test-kit.tsx";
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

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(readLists).mockResolvedValue([LIST]);
  vi.mocked(listQuestPeople).mockResolvedValue(undefined);
  vi.mocked(listPerformances).mockResolvedValue([]);
  vi.mocked(readTaskHistory).mockResolvedValue(HISTORY);
  vi.mocked(readRecurringTasks).mockResolvedValue([]);
  vi.mocked(readNextTasks).mockResolvedValue([]);
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

test("use_case_open_quest", async () => {
  await open(FOX_QUEST);
  await expect
    .element(page.getByRole("heading", { name: "Next task" }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: `${LIST.name} 0 open` }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=${LIST.id}`);
  await expect
    .element(
      page.getByRole("region", { name: QUEST_OVERVIEW_COPY.performRite }),
    )
    .toBeVisible();
  // An Active quest keeps its settings folded away until the user opens them.
  const dayGrid = page.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid });
  await expect.element(dayGrid).not.toBeInTheDocument();
  await page.getByText(QUEST_OVERVIEW_COPY.settings).click();
  await expect
    .element(dayGrid)
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=days`);
  await expect
    .element(page.getByRole("textbox", { name: "Message" }))
    .not.toBeInTheDocument();
});

// Bench's next open tasks, in order, numbered from #12.
const FIRST_NUMBER = 12;
// The next task's text, after its task number.
const NEXT_TEXT = /Sand the legs$/u;
const NEXT: OpenTask[] = [
  ["e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b51", "Sand the legs"],
  ["e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b52", "Glue the seat"],
  ["e3a1c8b0-5d1f-4a5e-9c2b-1f0e2d3c4b53", "Oil the top"],
].map(([id, text], index) => ({
  id: LIST_ITEM_ID.parse(id),
  listId: LIST.id,
  taskNumber: FIRST_NUMBER + index,
  text: text ?? "",
  checkedOff: false,
  recurring: false,
  cadence: "daily",
  createdAt: new Date("2026-11-01T09:00:00Z"),
}));

test("use_case_open_quest: Overview checks off the next task and recurring tasks in place", async () => {
  vi.mocked(readNextTasks).mockResolvedValue(NEXT);
  vi.mocked(readRecurringTasks).mockResolvedValue([
    {
      id: LIST_ITEM_ID.parse("5d0f43d4-4b0c-4cb5-9d5c-3a8f3e1c0b21"),
      listId: LIST.id,
      number: 1,
      text: STRETCH,
      cadence: "daily",
      done: false,
      createdAt: new Date("2026-11-01T09:00:00Z"),
    },
  ]);
  vi.mocked(changeListItemAction).mockReset();
  vi.mocked(changeListItemAction).mockResolvedValue({ kind: "saved" });
  await open(FOX_QUEST);
  const next = page.getByRole("region", { name: QUEST_SIDEBAR_COPY.nextTask });
  await expect.element(next.getByText(NEXT_TEXT)).toBeVisible();
  await expect
    .element(next.getByText("Then: #13 Glue the seat · #14 Oil the top"))
    .toBeVisible();
  await next.getByRole("button", { name: LISTS_COPY.checkOff }).click();
  expect(changeListItemAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
    listId: LIST.id,
    change: { kind: "check", id: NEXT[0]?.id, checkedOff: true },
  });

  const today = page.getByRole("region", { name: QUEST_OVERVIEW_COPY.today });
  await today.getByRole("checkbox", { name: STRETCH }).click();
  await expect
    .poll(() => changeListItemAction)
    .toHaveBeenLastCalledWith({
      questId: FOX_QUEST.id,
      listId: LIST.id,
      change: {
        kind: "check",
        id: LIST_ITEM_ID.parse("5d0f43d4-4b0c-4cb5-9d5c-3a8f3e1c0b21"),
        checkedOff: true,
      },
    });
});

test("use_case_tailored_quest_overviews", async () => {
  await open({ ...FOX_QUEST, name: "Morning", status: "completed" });
  await expect
    .element(page.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=days`);
  await expect
    .element(page.getByRole("button", { name: "Start Day" }))
    .not.toBeInTheDocument();
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
            .getByRole("button", { name: TIMER_COPY.panel.expand })
            .click();
        }
        const panel = page.getByRole("dialog", {
          name: TIMER_COPY.panel.label,
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
          .getByRole("button", { name: TIMER_COPY.panel.collapse })
          .click();
        await expect
          .element(page.getByRole("heading", { name: FOX_QUEST.name }))
          .toBeVisible();
      });
    }
  }
});
