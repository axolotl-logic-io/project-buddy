import { expect, type Locator, type Page } from "@playwright/test";
import { writeListContents } from "@/lists/list-item-store.ts";
import { saveList } from "@/lists/list-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { NEW_QUEST_COPY } from "@/ui/copy/quests.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import type { TestData } from "../support/test-database/data-test-kit.ts";
import { fillWhenReady, waitForHydrated } from "../system/page-helpers.ts";
import type { ActionName, PageName } from "./options.ts";
import { openSitePanel } from "./pages.ts";

const QUEST = "Audit garden";
const TASK = "Order seeds";
const TALLY = "Waterings";
const NEW_QUEST = "Audit new quest";
const RITE = "Audit rite";
const RITE_NAME = /^Audit rite/u;
const QUEST_PATH = /\/quests\/[^/?]+$/u;

interface Action {
  readonly target: Locator;
  readonly outcome: () => Promise<void>;
}

function visible(target: Locator, marker: Locator): Action {
  return {
    target,
    outcome: async (): Promise<void> => expect(marker).toBeVisible(),
  };
}

async function clickReady(target: Locator): Promise<void> {
  await waitForHydrated(target);
  await target.click();
}

function button(page: Page | Locator, name: string): Locator {
  return page.getByRole("button", { name, exact: true });
}

function taskBox(page: Page): Locator {
  return page.getByRole("checkbox", { name: TASK, exact: true });
}

function checkOff(page: Page): Action {
  const task = taskBox(page);
  return {
    target: task,
    outcome: async (): Promise<void> => expect(task).toBeHidden(),
  };
}

async function undo(page: Page): Promise<Action> {
  const task = taskBox(page);
  await clickReady(task);
  return visible(button(page, LISTS_COPY.undo), task);
}

async function incrementTally(page: Page): Promise<Action> {
  await clickReady(button(page, `${TALLIES_COPY.increment} ${TALLY}`));
  await fillWhenReady(
    page.getByRole("spinbutton", { name: TALLIES_COPY.incrementBy(TALLY) }),
    "3",
  );
  return visible(
    button(page, TALLIES_COPY.add),
    page.getByText(TALLIES_COPY.saved, { exact: true }),
  );
}

async function quickAdd(page: Page): Promise<Action> {
  await openSitePanel(page);
  await button(page, QUICK_ADD_COPY.panelItem).click();
  const dialog = page.getByRole("dialog", { name: QUICK_ADD_COPY.heading });
  const list = dialog.getByRole("combobox", { name: QUICK_ADD_COPY.listLabel });
  await list.selectOption({ label: "Tasks" });
  await fillWhenReady(
    dialog.getByRole("textbox", { name: QUICK_ADD_COPY.textLabel }),
    "Buy gloves",
  );
  return visible(
    button(dialog, QUICK_ADD_COPY.save),
    dialog.getByText(QUICK_ADD_COPY.savedToList(QUEST, "Tasks"), {
      exact: true,
    }),
  );
}

function messageBox(page: Page): Locator {
  return page.getByRole("textbox", {
    name: PERFORMANCE_COPY.message,
    exact: true,
  });
}

async function startPerformance(page: Page): Promise<Action> {
  await clickReady(button(page, QUEST_OVERVIEW_COPY.performRiteOn("Tasks")));
  const dialog = page.getByRole("dialog", {
    name: QUEST_OVERVIEW_COPY.performRite,
  });
  await dialog.getByRole("radio", { name: RITE_NAME }).check();
  return visible(button(dialog, PERFORMANCE_COPY.start), messageBox(page));
}

async function sendMessage(page: Page): Promise<Action> {
  const start = await startPerformance(page);
  await start.target.click();
  await start.outcome();
  await fillWhenReady(messageBox(page), "Plant tomatoes");
  return visible(
    button(page, PERFORMANCE_COPY.send),
    page.getByText("Noted.", { exact: true }),
  );
}

function startTimer(page: Page): Action {
  return visible(
    button(page, TIMER_COPY.start),
    page.getByRole("region", { name: TIMER_COPY.displayLabel, exact: true }),
  );
}

async function startQuest(page: Page): Promise<Action> {
  await clickReady(button(page, NEW_QUEST_COPY.open));
  const dialog = page.getByRole("dialog", { name: NEW_QUEST_COPY.title });
  await fillWhenReady(
    dialog.getByRole("textbox", { name: NEW_QUEST_COPY.nameLabel }),
    NEW_QUEST,
  );
  return {
    target: button(dialog, NEW_QUEST_COPY.start),
    outcome: async (): Promise<void> => {
      await expect(page).toHaveURL(QUEST_PATH);
      await expect(
        page.getByRole("heading", { name: NEW_QUEST, level: 1, exact: true }),
      ).toBeVisible();
    },
  };
}

const ACTIONS: Record<
  ActionName,
  {
    readonly page: PageName;
    readonly prepare: (page: Page) => Action | Promise<Action>;
  }
> = {
  "check-off-task": { page: "home", prepare: checkOff },
  "undo-task-check-off": { page: "home", prepare: undo },
  "increment-tally": { page: "home", prepare: incrementTally },
  "quick-add-task": { page: "home", prepare: quickAdd },
  "start-performance": { page: "overview", prepare: startPerformance },
  "send-performance-message": { page: "overview", prepare: sendMessage },
  "start-timer": { page: "timer", prepare: startTimer },
  "start-quest": { page: "quests", prepare: startQuest },
};

async function seedAction(
  action: ActionName,
  testData: TestData,
  owner: Parameters<typeof saveList>[0],
): Promise<string> {
  const quest = await testData.quest(QUEST);
  await testData.task(quest, TASK);
  const { [action]: target } = ACTIONS;
  if (target.page === "overview") {
    await testData.rite(RITE);
    return `/quests/${quest.id}`;
  }
  if (action === "increment-tally") {
    const list = await saveList(owner, quest.id, {
      name: "Tallies",
      type: "tally",
    });
    if (typeof list !== "object") {
      throw new Error("Could not seed a tally list");
    }
    const seeded = await writeListContents(owner, quest.id, list.id, {
      kind: "add",
      text: TALLY,
    });
    if (seeded.result !== "saved") {
      throw new Error("Could not seed a tally");
    }
  }
  if (target.page === "home") {
    return "/";
  }
  return `/${target.page}`;
}

export { ACTIONS, seedAction };
