// "use_case_view_quests" and "use_case_find_quest" in use-cases/quests.md:
// Quests' finder, its quests by status, narrowed to shared ones and
// sorted, and its search across quests and the tasks of Active ones, each
// task checked off where it is found.

import type { JSX } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { QuestFinder } from "@/components/quest-finder.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { FinderQuest } from "@/quests/quest-finder-entries.ts";
import type { QuestStatus } from "@/quests/quest-status.ts";
import type { Quest } from "@/quests/store.ts";
import type { FoundTask } from "@/tasks/task-search-store.ts";
import { THEME_MODES } from "@/themes/themes.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { QUEST_FINDER_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";
import { replace } from "./router-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

// Long enough for the search's pause to pass.
const SEARCH_WAIT_MS = 1000;
const TAB_TARGET_PX = 24;
const KEEPS_STATUS = /[?&]status=completed/u;
const SEARCHES_FOX = /[?&]q=fox/u;

// A quest as Quests lists it, active a day ago.
function row(
  quest: Partial<Quest> = {},
  more: Partial<FinderQuest> = {},
): FinderQuest {
  return {
    quest: { ...FOX_QUEST, ...quest },
    seal: "L",
    openTasks: 3,
    runningRite: undefined,
    lastActive: "2026-11-24T12:00:00.000Z",
    activity: "active yesterday",
    resting: false,
    ...more,
  };
}

const LIFE = row({ id: questIdFixture(), name: "Life", life: true });
const SHARED = row(
  { id: questIdFixture(), name: "Choir", sharing: { kind: "shared" } },
  { lastActive: "2026-11-20T12:00:00.000Z" },
);
const BREAD = row(
  { id: questIdFixture(), name: "Bread" },
  { lastActive: "2026-11-01T12:00:00.000Z" },
);

// A task the search found in the fox quest.
function task(text: string, more: Partial<FoundTask> = {}): FoundTask {
  return {
    id: LIST_ITEM_ID.parse(crypto.randomUUID()),
    listId: LIST_ID.parse(crypto.randomUUID()),
    text,
    quest: { id: FOX_QUEST.id, name: FOX_QUEST.name, shared: false },
    done: false,
    earlier: false,
    repeats: undefined,
    ...more,
  };
}

function finder(
  quests: readonly FinderQuest[],
  initialStatus: QuestStatus = "active",
  search = "",
  found: readonly FoundTask[] = [],
): JSX.Element {
  return (
    <QuestFinder
      found={found}
      initialStatus={initialStatus}
      quests={quests}
      search={search}
    />
  );
}

function statusTab(status: QuestStatus, count: number): Locator {
  return page.getByRole("tab", {
    name: `${QUEST_STATUS_COPY.labels[status]} ${count}`,
    exact: true,
  });
}

function questNames(): string[] {
  return page
    .getByRole("tabpanel")
    .getByRole("link")
    .elements()
    .map((link) => link.textContent ?? "");
}

afterEach(() => {
  vi.clearAllMocks();
  const url = new URL(globalThis.location.href);
  url.search = "";
  globalThis.history.replaceState(null, "", url);
});

describe("use_case_view_quests", () => {
  test("filters quests by status with the keyboard and keeps the status in the address", async () => {
    await render(finder([row({ status: "completed" })]));
    await expect
      .element(page.getByText(QUESTS_COPY.none, { exact: true }))
      .toBeVisible();
    statusTab("active", 0).element().focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(statusTab("completed", 1))
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(page.getByRole("link", { name: FOX_QUEST.name }))
      .toHaveAttribute("href", `/quests/${FOX_QUEST.id}`);
    await expect
      .element(page.getByRole("button", { name: QUEST_STATUS_COPY.restore }))
      .toBeVisible();
    expect(new URL(globalThis.location.href).searchParams.get("status")).toBe(
      "completed",
    );
  });

  test("leaves out their own Life, which is pinned above", async () => {
    await render(finder([LIFE, row()]));
    await expect.element(statusTab("active", 1)).toBeVisible();
    expect(questNames()).toEqual([FOX_QUEST.name]);
  });

  test("shows each quest's open tasks, activity, running rite and sharing", async () => {
    await render(
      finder([
        row(
          { sharing: { kind: "joined", owner: "Rowan" } },
          { runningRite: "Capture", resting: true },
        ),
      ]),
    );
    const quest = page.getByRole("tabpanel").getByRole("listitem");
    await Promise.all(
      [
        `3 ${QUEST_FINDER_COPY.open}`,
        "active yesterday",
        QUEST_FINDER_COPY.running("Capture"),
        "Shared by Rowan",
        QUEST_FINDER_COPY.resting,
      ].map((text) =>
        expect.element(quest.getByText(text, { exact: true })).toBeVisible(),
      ),
    );
  });

  test("Shared narrows the list to quests with others in them", async () => {
    await render(finder([row(), SHARED]));
    const shared = page.getByRole("button", { name: QUEST_FINDER_COPY.shared });
    await shared.click();
    await expect.element(shared).toHaveAttribute("aria-pressed", "true");
    expect(questNames()).toEqual([SHARED.quest.name]);
  });

  test("sorts by recent activity, by name or by newest", async () => {
    await render(
      finder([
        row({ createdAt: new Date("2026-01-01") }),
        row(
          { ...SHARED.quest, createdAt: new Date("2026-03-01") },
          { lastActive: SHARED.lastActive },
        ),
        row(
          { ...BREAD.quest, createdAt: new Date("2026-02-01") },
          { lastActive: BREAD.lastActive },
        ),
      ]),
    );
    expect(questNames()).toEqual(["Low-poly fox", "Choir", "Bread"]);
    const sort = page.getByRole("combobox", {
      name: QUEST_FINDER_COPY.sortLabel,
    });
    await sort.selectOptions(QUEST_FINDER_COPY.sorts.name);
    expect(questNames()).toEqual(["Bread", "Choir", "Low-poly fox"]);
    await sort.selectOptions(QUEST_FINDER_COPY.sorts.newest);
    expect(questNames()).toEqual(["Choir", "Bread", "Low-poly fox"]);
  });

  test("restoring from the list keeps Undo available once the row has gone", async () => {
    vi.mocked(changeQuestStatusAction).mockResolvedValue({
      kind: "saved",
      message: "Quest restored.",
      change: {
        questId: FOX_QUEST.id,
        fromStatus: "completed",
        toStatus: "active",
        revision: 2,
      },
    });
    const view = await render(
      finder([row({ status: "completed", statusRevision: 1 })], "completed"),
    );
    page
      .getByRole("button", { name: QUEST_STATUS_COPY.restore })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("button", { name: QUEST_STATUS_COPY.undo }))
      .toBeVisible();
    await view.rerender(
      finder([row({ status: "active", statusRevision: 2 })], "completed"),
    );
    await expect
      .element(page.getByRole("link", { name: FOX_QUEST.name }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole("status")).toHaveFocus();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(1);
    await expect
      .element(page.getByRole("button", { name: QUEST_STATUS_COPY.undo }))
      .toBeVisible();
  });
});

describe("use_case_find_quest", () => {
  test("/ focuses the search, and typing searches once it pauses, keeping the status", async () => {
    globalThis.history.replaceState(null, "", "?status=completed");
    await render(finder([row()]));
    await userEvent.keyboard("/");
    const search = page.getByRole("searchbox", {
      name: QUEST_FINDER_COPY.searchLabel,
    });
    await expect.element(search).toHaveFocus();
    await userEvent.keyboard("fox");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1), {
      timeout: SEARCH_WAIT_MS,
    });
    expect(replace.mock.calls[0]?.[0]).toMatch(KEEPS_STATUS);
    expect(replace.mock.calls[0]?.[0]).toMatch(SEARCHES_FOX);
  });

  test("finds quests of any status, Life too, by name, ignoring case, and marks the match", async () => {
    await render(
      finder([LIFE, row({ status: "abandoned" }), SHARED], "active", "LI"),
    );
    const quests = page.getByRole("region", {
      name: `${QUEST_FINDER_COPY.questsHeading} 1`,
    });
    await expect.element(quests).toBeVisible();
    await expect
      .element(quests.getByRole("link", { name: "Life" }))
      .toBeVisible();
    await expect.element(quests.getByText("Li", { exact: true })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "Choir" }))
      .not.toBeInTheDocument();
  });

  test("checks off a found task in place, with its quest and a link to it", async () => {
    let finish: (() => void) | undefined;
    vi.mocked(changeListItemAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = (): void => resolve({ kind: "saved" });
        }),
    );
    const water = task("Water the ferns", {
      repeats: { cadence: "weekly", streak: 4 },
    });
    await render(finder([row()], "active", "fern", [water]));
    const tasks = page.getByRole("region", {
      name: `${QUEST_FINDER_COPY.tasksHeading} ${QUEST_FINDER_COPY.taskCounts(1, 0)}`,
    });
    await expect
      .element(tasks.getByText(`${FOX_QUEST.name} · 4-week streak`))
      .toBeVisible();
    await expect
      .element(tasks.getByRole("img", { name: "Repeats weekly" }))
      .toBeVisible();
    await expect
      .element(
        tasks.getByRole("link", {
          name: QUEST_FINDER_COPY.openTaskLabel(FOX_QUEST.name),
        }),
      )
      .toHaveAttribute("href", `/quests/${FOX_QUEST.id}`);
    // Checking it off changes the counts in the group's name.
    const box = page.getByRole("checkbox", { name: water.text });
    await box.click();
    await expect.element(box).toBeChecked();
    expect(changeListItemAction).toHaveBeenCalledWith({
      questId: FOX_QUEST.id,
      listId: water.listId,
      change: { kind: "check", id: water.id, checkedOff: true },
    });
    finish?.();
  });

  test("folds tasks checked off before today under a button", async () => {
    await render(
      finder([row()], "active", "fern", [
        task("Repot the fern"),
        task("Buy a fern", { done: true, earlier: true }),
      ]),
    );
    await expect
      .element(page.getByRole("checkbox", { name: "Buy a fern" }))
      .not.toBeInTheDocument();
    const more = page.getByRole("button", {
      name: QUEST_FINDER_COPY.showEarlier(1),
    });
    await more.click();
    await expect
      .element(page.getByRole("checkbox", { name: "Buy a fern" }))
      .toBeChecked();
    await expect
      .element(
        page.getByRole("button", { name: QUEST_FINDER_COPY.hideEarlier }),
      )
      .toHaveAttribute("aria-expanded", "true");
  });

  test("Escape clears the search and brings the list back", async () => {
    await render(finder([row()], "active", "fern", [task("Repot the fern")]));
    const search = page.getByRole("searchbox", {
      name: QUEST_FINDER_COPY.searchLabel,
    });
    await search.click();
    await userEvent.keyboard("{Escape}");
    await expect.element(search).toHaveValue("");
    await expect.element(statusTab("active", 1)).toBeVisible();
  });
});

describe("Quests on phones", () => {
  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    for (const mode of THEME_MODES) {
      test(`the statuses, filters and a long shared quest fit ${viewport.width} px in ${mode}`, async () => {
        applyTheme("parchment", mode);
        await setViewport(viewport);
        const name = "One layer up: interface, associativity explorer";
        await render(
          finder([
            row(
              { name, sharing: { kind: "joined", owner: "Rowan" } },
              { runningRite: "Brainstorm" },
            ),
          ]),
        );
        await expect.element(page.getByRole("link", { name })).toBeVisible();
        const active = statusTab("active", 1);
        const completed = statusTab("completed", 0);
        for (const tab of page.getByRole("tab").elements()) {
          const box = tab.getBoundingClientRect();
          expect(box.left).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(viewport.width);
          expect(box.height).toBeGreaterThanOrEqual(TAB_TARGET_PX);
        }
        expect(getComputedStyle(active.element()).backgroundColor).not.toBe(
          getComputedStyle(completed.element()).backgroundColor,
        );
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
      });
    }
  }
});
