// "use_case_split_list_item" in use-cases/lists.md, in the browser: a list
// item's menu opens the Split dialog, which shows the item, starts with two
// parts, takes more, and checks every part before it saves. What the split
// saves is the server tests'.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ListItems } from "@/components/list-items.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const QUEST_ID = questIdFixture();
const LIST: List = {
  id: LIST_ID.parse(crypto.randomUUID()),
  position: 0,
  name: "Errands",
  type: "task",
  version: 3,
};
const COPY = LISTS_COPY.split("task");
const SHOP = "Buy flour, yeast and salt";
// Parts beyond the two a split starts with, by number.
const THIRD = 3;
const FOURTH = 4;

function task(text: string, more: Partial<ListItem> = {}): ListItem {
  return {
    id: LIST_ITEM_ID.parse(crypto.randomUUID()),
    text,
    taskNumber: 1,
    checkedOff: false,
    recurring: false,
    cadence: "daily",
    createdAt: new Date("2026-11-10T08:00:00Z"),
    ...more,
  };
}

function list(contents: readonly ListItem[]): React.JSX.Element {
  return (
    <ListItems
      questId={QUEST_ID}
      list={LIST}
      contents={contents}
      destinations={[]}
    />
  );
}

function actions(): ReturnType<typeof page.getByRole> {
  return page
    .getByRole("listitem")
    .filter({ hasText: SHOP })
    .getByRole("button", { name: LISTS_COPY.actions("task") });
}

async function openSplit(): Promise<ReturnType<typeof page.getByRole>> {
  await actions().click();
  await page
    .getByRole("menuitem", { name: LISTS_COPY.splitListItem("task") })
    .click();
  return page.getByRole("dialog", { name: COPY.title });
}

function part(number: number): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: COPY.part(number) });
}

afterEach(() => {
  vi.mocked(changeListItemAction).mockReset();
});

describe("use_case_split_list_item", () => {
  test("Split shows the task, takes a part for each new task and saves them", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({
      kind: "saved",
      message: LISTS_COPY.splitDone("task", THIRD),
      undoVersion: LIST.version + 1,
    });
    const shop = task(SHOP);
    await render(list([shop]));

    const dialog = await openSplit();
    await expect.element(dialog.getByText(SHOP)).toBeVisible();
    await expect.element(part(1)).toHaveFocus();
    await expect.element(part(2)).toHaveValue("");
    await expect.element(part(THIRD)).not.toBeInTheDocument();

    await part(1).fill("Buy flour");
    await part(2).fill("Buy yeast");
    await dialog.getByRole("button", { name: COPY.addPart }).click();
    await expect.element(part(THIRD)).toHaveFocus();
    await userEvent.keyboard("Buy salt");
    await dialog.getByRole("button", { name: COPY.submit(THIRD) }).click();

    expect(changeListItemAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      listId: LIST.id,
      change: {
        kind: "split",
        id: shop.id,
        texts: ["Buy flour", "Buy yeast", "Buy salt"],
      },
    });
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(actions()).toHaveFocus();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(LISTS_COPY.splitDone("task", THIRD));
  });

  test("an empty part is refused with the reason, and a part beyond two can go", async () => {
    await render(list([task(SHOP)]));
    const dialog = await openSplit();
    await expect
      .element(dialog.getByRole("button", { name: COPY.removePart(2) }))
      .not.toBeInTheDocument();

    await part(1).fill("Buy flour");
    await dialog.getByRole("button", { name: COPY.submit(2) }).click();
    expect(changeListItemAction).not.toHaveBeenCalled();
    await expect.element(part(2)).toHaveFocus();
    await expect
      .element(part(2))
      .toHaveAccessibleDescription(LISTS_COPY.changeProblems["invalid-text"]);

    await dialog.getByRole("button", { name: COPY.addPart }).click();
    await dialog.getByRole("button", { name: COPY.removePart(THIRD) }).click();
    await expect.element(part(THIRD)).not.toBeInTheDocument();
    await expect.element(part(2)).toHaveFocus();
  });

  test("pasting several lines into a part makes a task of each", async () => {
    await render(list([task(SHOP)]));
    await openSplit();
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "Buy flour\nBuy yeast\n\nBuy salt\n");
    part(1)
      .element()
      .dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData,
          bubbles: true,
          cancelable: true,
        }),
      );

    await expect.element(part(1)).toHaveValue("Buy flour");
    await expect.element(part(2)).toHaveValue("Buy yeast");
    await expect.element(part(THIRD)).toHaveValue("Buy salt");
    await expect.element(part(FOURTH)).not.toBeInTheDocument();
    await expect.element(part(THIRD)).toHaveFocus();
  });

  test("Escape closes the dialog without a change and returns focus", async () => {
    await render(list([task(SHOP)]));
    const dialog = await openSplit();
    await part(1).fill("Buy flour");
    await userEvent.keyboard("{Escape}");

    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(actions()).toHaveFocus();
    expect(changeListItemAction).not.toHaveBeenCalled();
  });

  test("a checked-off task offers no Split", async () => {
    await render(list([task(SHOP, { checkedOff: true })]));
    await page.getByText(LISTS_COPY.done).click();
    await actions().click();
    await expect
      .element(
        page.getByRole("menuitem", {
          name: LISTS_COPY.removeListItem("task"),
        }),
      )
      .toBeVisible();
    await expect
      .element(
        page.getByRole("menuitem", {
          name: LISTS_COPY.splitListItem("task"),
        }),
      )
      .not.toBeInTheDocument();
  });
});
