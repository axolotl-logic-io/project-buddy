import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { type DailiesDay, LOCAL_DATE } from "@/dailies/dailies.ts";
import { changeQuestDay } from "@/dailies/quest-day-actions.ts";
import {
  readQuestDays,
  readRecurringTasks,
} from "@/dailies/quest-day-store.ts";
import { LIST_ID } from "@/lists/list.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import { listPerformances } from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { DAY_GRID_COPY } from "@/ui/copy/dailies.ts";
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
  vi.mocked(readQuestDays).mockResolvedValue({ days: [], undoable: false });
  vi.mocked(readRecurringTasks).mockResolvedValue({ items: [] });
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
});

// A Dailies quest's days: a missed day, a gap, and the day still going.
const STRETCH = "Stretch";
function endedDay(date: string, done: boolean): DailiesDay {
  return {
    date: LOCAL_DATE.parse(date),
    startedAt: new Date(`${date}T07:00:00Z`),
    tasks: [{ number: 1, text: STRETCH, done }],
  };
}
const DAYS: readonly DailiesDay[] = [
  endedDay("2026-11-10", true),
  endedDay("2026-11-11", true),
  endedDay("2026-11-12", true),
  endedDay("2026-11-13", true),
  endedDay("2026-11-15", true),
  endedDay("2026-11-16", false),
  endedDay("2026-11-17", true),
  {
    date: LOCAL_DATE.parse("2026-11-18"),
    startedAt: new Date("2026-11-18T07:00:00Z"),
  },
];

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

test("use_case_dailies", async () => {
  vi.mocked(changeQuestDay).mockResolvedValue({ kind: "saved" });
  await open({ ...FOX_QUEST, dailies: true });
  await page.getByRole("button", { name: "Start Day" }).click();
  const dialog = page.getByRole("dialog", { name: "Start Day" });
  const list = dialog.getByRole("checkbox", { name: LIST.name });
  await expect.element(list).not.toBeChecked();
  await list.click();
  await dialog.getByRole("button", { name: "Start Day", exact: true }).click();
  expect(changeQuestDay).toHaveBeenCalledWith(
    expect.objectContaining({ emptyLists: [LIST.id], questId: FOX_QUEST.id }),
  );
});

test("use_case_tailored_quest_overviews", async () => {
  await open({
    ...FOX_QUEST,
    name: "Morning",
    dailies: true,
    status: "completed",
  });
  await expect
    .element(page.getByRole("link", { name: "Day grid" }))
    .toBeVisible();
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
    vi.mocked(readQuestDays).mockResolvedValue({ undoable: false, days: DAYS });
    vi.mocked(readRecurringTasks).mockResolvedValue({
      items: [{ number: 1, text: STRETCH, done: true, recurring: true }],
    });
    await open({ ...FOX_QUEST, dailies: true }, "days");
    const grid = page.getByRole("listitem").filter({ hasText: STRETCH });
    await expect
      .element(page.getByRole("heading", { name: DAY_GRID_COPY.heading }))
      .toBeVisible();
    const days = grid.getByRole("listitem");
    expect(days.elements().map((day) => day.textContent)).toEqual([
      expect.stringContaining("Thu 2026-11-12: done"),
      expect.stringContaining("Fri 2026-11-13: done"),
      expect.stringContaining("Sat 2026-11-14: no day started"),
      expect.stringContaining("Sun 2026-11-15: done"),
      expect.stringContaining("Mon 2026-11-16: not done"),
      expect.stringContaining("Tue 2026-11-17: done"),
      expect.stringContaining("Wed 2026-11-18: done"),
    ]);
    await expect.element(page.getByText(DAY_GRID_COPY.legend)).toBeVisible();
  });

  test("before the first Start Day, Day grid says Start Day begins counting", async () => {
    await open({ ...FOX_QUEST, dailies: true }, "days");
    await expect.element(page.getByText(DAY_GRID_COPY.noDays)).toBeVisible();
  });

  test("with no recurring tasks, Day grid says how to make one", async () => {
    vi.mocked(readQuestDays).mockResolvedValue({ undoable: false, days: DAYS });
    await open({ ...FOX_QUEST, dailies: true }, "days");
    await expect
      .element(page.getByText(DAY_GRID_COPY.noRecurring))
      .toBeVisible();
  });

  test("a quest not started as Dailies has no Day grid", async () => {
    await open(FOX_QUEST, "days");
    await expect
      .element(page.getByRole("heading", { name: DAY_GRID_COPY.heading }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid }))
      .not.toBeInTheDocument();
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
