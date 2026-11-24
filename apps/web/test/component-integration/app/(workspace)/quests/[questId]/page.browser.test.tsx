import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import { listPerformances } from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import { DAY_GRID_COPY } from "@/ui/copy/day-grid.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
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
  checkOff: "Finish",
  uncheck: "Resume",
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
    .element(page.getByRole("link", { name: LIST.name }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=${LIST.id}`);
  await expect
    .element(page.getByRole("link", { name: "Rites & status" }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "Performances" }))
    .toBeVisible();
  await expect
    .element(page.getByRole("textbox", { name: "Message" }))
    .not.toBeInTheDocument();
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
  test("Day grid shows each recurring task's last seven dates, named for screen readers", async () => {
    vi.mocked(readRecurringTasks).mockResolvedValue([
      {
        number: 1,
        text: STRETCH,
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
      expect.stringContaining("Thu 2026-11-12: done"),
      expect.stringContaining("Fri 2026-11-13: done"),
      expect.stringContaining("Sat 2026-11-14: not done"),
      expect.stringContaining("Sun 2026-11-15: done"),
      expect.stringContaining("Mon 2026-11-16: not done"),
      expect.stringContaining("Tue 2026-11-17: done"),
      expect.stringContaining("Wed 2026-11-18: not done yet"),
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
