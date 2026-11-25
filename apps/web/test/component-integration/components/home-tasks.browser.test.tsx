// "use_case_home_tasks": Home's one-off tasks across quests, checked off
// or unchecked in place.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { HomeTasks } from "@/components/home-tasks.tsx";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { TaskQuest } from "@/tasks/task-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const POST = "Post the parcel";
const BANK = "Call the bank about the standing order";
const LIST = LIST_ID.parse("3c1b8f2e-6a4d-4f0e-9b7a-2d5c8e1f4a3b");
const POST_ID = LIST_ITEM_ID.parse("9a7e2c4b-1d3f-4b6a-8e0c-5f2d7a9b1c3e");

const ERRANDS: TaskQuest = {
  quest: {
    id: questIdFixture("1e4b7c2a-5d8f-4a3b-9c6e-0f2a4d6b8c1e"),
    name: "Errands",
  },
  tasks: [
    { id: POST_ID, listId: LIST, text: POST, done: false },
    {
      id: LIST_ITEM_ID.parse("2b5d8e1f-4a7c-4d9b-8f3e-6c1a9d4b7e2f"),
      listId: LIST,
      text: BANK,
      done: true,
    },
  ],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_home_tasks", () => {
  test("each quest links to itself above its tasks, with its open count", async () => {
    await render(<HomeTasks quests={[ERRANDS]} />);

    await expect
      .element(page.getByRole("link", { name: "Errands" }))
      .toHaveAttribute("href", `/quests/${ERRANDS.quest.id}`);
    await expect.element(page.getByText(HOME_COPY.openCount(1))).toBeVisible();
    await expect
      .element(page.getByRole("checkbox", { name: POST }))
      .not.toBeChecked();
    await expect
      .element(page.getByRole("checkbox", { name: BANK }))
      .toBeChecked();
  });

  test("checking a task off checks it off in its list", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({
      kind: "saved",
      message: LISTS_COPY.checkedOff,
    });
    await render(<HomeTasks quests={[ERRANDS]} />);

    await page.getByRole("checkbox", { name: POST }).click();

    await expect
      .poll(() => vi.mocked(changeListItemAction).mock.calls)
      .toEqual([
        [
          {
            questId: ERRANDS.quest.id,
            listId: LIST,
            change: { kind: "check", id: POST_ID, checkedOff: true },
          },
        ],
      ]);
    await expect.element(page.getByText(LISTS_COPY.checkedOff)).toBeVisible();
  });

  test("a check that fails says why", async () => {
    vi.mocked(changeListItemAction).mockResolvedValue({
      kind: "problem",
      text: LISTS_COPY.saveFailed,
    });
    await render(<HomeTasks quests={[ERRANDS]} />);

    await page.getByRole("checkbox", { name: BANK }).click();

    await expect.element(page.getByText(LISTS_COPY.saveFailed)).toBeVisible();
  });

  test("without a one-off task there is nothing to do yet", async () => {
    await render(<HomeTasks quests={[]} />);

    await expect.element(page.getByText(HOME_COPY.noTasks)).toBeVisible();
  });
});
