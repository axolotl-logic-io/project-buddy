// "use_case_quest_lists" in use-cases/lists.md, in the browser: a list's
// page searches and adds its items from one box, moves an item from its
// menu, shows done items under Done and keeps its settings behind a gear.
// What each change saves is the server tests'.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ListPage } from "@/components/list-page.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import { EDITABLE_LIST_COPY } from "@/ui/copy/editable-list.ts";
import { LIST_PAGE_COPY } from "@/ui/copy/list-page.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const QUEST_ID = questIdFixture();
const QUEST = "Life";
const TASKS: List = {
  id: LIST_ID.parse(crypto.randomUUID()),
  position: 0,
  name: "Tasks",
  type: "task",
  version: 3,
};
const ERRANDS: List = {
  id: LIST_ID.parse(crypto.randomUUID()),
  position: 1,
  name: "Errands",
  type: "task",
  version: 1,
};
const PASSPORT = "Renew the passport";
const DENTIST = "Book the dentist";
const INK = "Order printer ink";

function task(
  text: string,
  taskNumber: number,
  more: Partial<ListItem> = {},
): ListItem {
  return {
    id: LIST_ITEM_ID.parse(crypto.randomUUID()),
    text,
    taskNumber,
    checkedOff: false,
    recurring: false,
    cadence: "daily",
    createdAt: new Date("2026-11-10T08:00:00Z"),
    ...more,
  };
}

// Renewing the passport and booking the dentist are open; the ink is done.
const ITEMS = [PASSPORT, DENTIST, INK].map((text, index) =>
  task(text, index + 1, { checkedOff: text === INK }),
);

async function renderPage(): Promise<void> {
  await render(
    <ListPage
      questId={QUEST_ID}
      quest={QUEST}
      back={`/quests/${QUEST_ID}`}
      list={TASKS}
      contents={ITEMS}
      destinations={[ERRANDS]}
      history={undefined}
      tallies={undefined}
      next={undefined}
      rites={undefined}
    />,
  );
}

function searchBox(): ReturnType<typeof page.getByRole> {
  return page.getByRole("searchbox", {
    name: LIST_PAGE_COPY.searchIn("task", TASKS.name),
  });
}

function row(text: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("listitem").filter({ hasText: text });
}

afterEach(() => {
  vi.mocked(changeListItemAction).mockReset();
});

describe("use_case_quest_lists", () => {
  test("the page links back to the quest and shows done tasks under Done, open", async () => {
    await renderPage();
    await expect
      .element(page.getByRole("link", { name: LIST_PAGE_COPY.back(QUEST) }))
      .toHaveAttribute("href", `/quests/${QUEST_ID}`);
    await expect
      .element(page.getByRole("heading", { name: TASKS.name }))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: `${LISTS_COPY.done} 1` }))
      .toBeVisible();
    const done = page.getByRole("list", { name: LISTS_COPY.done });
    await expect.element(done.getByText(INK)).toBeVisible();
  });

  test("the gear shows and hides the list's settings", async () => {
    await renderPage();
    const gear = page.getByRole("button", { name: LISTS_COPY.settings });
    const settings = page.getByRole("form", { name: LISTS_COPY.settings });
    await expect.element(gear).toHaveAttribute("aria-expanded", "false");
    await expect.element(settings).not.toBeInTheDocument();

    await gear.click();
    await expect.element(gear).toHaveAttribute("aria-expanded", "true");
    await expect.element(settings).toBeVisible();

    await gear.click();
    await expect.element(settings).not.toBeInTheDocument();
  });

  test("typing narrows the list, marks each match and hides the drag handles", async () => {
    await renderPage();
    await expect
      .element(
        page.getByRole("button", {
          name: EDITABLE_LIST_COPY.reorder(PASSPORT),
        }),
      )
      .toBeVisible();

    await searchBox().fill("passport");
    await expect.element(row(PASSPORT)).toBeVisible();
    await expect.element(row(DENTIST)).not.toBeInTheDocument();
    await expect
      .element(row(PASSPORT).getByText("passport", { exact: true }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", {
          name: EDITABLE_LIST_COPY.reorder(PASSPORT),
        }),
      )
      .not.toBeInTheDocument();
    await expect
      .element(page.getByText(LIST_PAGE_COPY.matches("task", 1, "passport")))
      .toBeVisible();

    await searchBox().fill("zebra");
    await expect
      .element(page.getByText(LIST_PAGE_COPY.noMatch("task", "zebra")))
      .toBeVisible();
  });

  test("Enter adds the text as a new task and empties the box", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({
      kind: "saved",
      message: LISTS_COPY.savedChange,
      undoVersion: TASKS.version + 1,
    });
    await renderPage();
    await searchBox().fill("Call the bank");
    await userEvent.keyboard("{Enter}");

    await expect
      .poll(() => vi.mocked(changeListItemAction).mock.calls)
      .toEqual([
        [
          {
            questId: QUEST_ID,
            listId: TASKS.id,
            change: { kind: "add", text: "Call the bank" },
          },
        ],
      ]);
    await expect.element(searchBox()).toHaveValue("");
    await expect
      .element(
        page.getByText(LIST_PAGE_COPY.added("Call the bank", TASKS.name)),
      )
      .toBeVisible();
  });

  test("a task already on the list, open or done, is not added again", async () => {
    await renderPage();
    await searchBox().fill(PASSPORT.toUpperCase());
    await expect
      .element(page.getByText(LIST_PAGE_COPY.already(PASSPORT, false)))
      .toBeVisible();
    await userEvent.keyboard("{Enter}");

    await searchBox().fill(INK);
    await expect
      .element(page.getByText(LIST_PAGE_COPY.already(INK, true)))
      .toBeVisible();
    await userEvent.keyboard("{Enter}");

    expect(changeListItemAction).not.toHaveBeenCalled();
  });

  test("Escape empties the box and shows the whole list again", async () => {
    await renderPage();
    await searchBox().fill("passport");
    await expect.element(row(DENTIST)).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await expect.element(searchBox()).toHaveValue("");
    await expect.element(row(DENTIST)).toBeVisible();
  });

  test("a task's menu moves it to another list of the quest", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({
      kind: "saved",
      message: LISTS_COPY.savedChange,
      undoVersion: TASKS.version + 1,
    });
    await renderPage();
    const [passport] = ITEMS;
    await row(PASSPORT)
      .getByRole("button", { name: LISTS_COPY.actions("task") })
      .click();
    await expect.element(page.getByText(LISTS_COPY.moveTo)).toBeVisible();
    await page
      .getByRole("menuitem", { name: LISTS_COPY.moveInto(ERRANDS.name) })
      .click();

    expect(changeListItemAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      listId: TASKS.id,
      change: { kind: "move", id: passport?.id, destination: ERRANDS.id },
    });
  });
});
