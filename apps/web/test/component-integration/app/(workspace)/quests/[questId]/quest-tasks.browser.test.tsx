// A quest's tasks, in Chromium and WebKit: the open tasks with their
// controls, editing and moving a task without the construct, and Undo for
// the last change. "use_case_recurring_tasks": in Dailies, a task's menu makes
// it recurring. What the actions save is tasks.server.test.ts's.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { TasksActions } from "@/components/tasks/use-tasks.ts";
import type { TasksState } from "@/tasks/tasks.ts";
import type {
  changeTasksAction,
  runChatCommandAction,
  undoTasksChangeAction,
} from "@/tasks/tasks-actions.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";
import { questIdFixture } from "../../../../../support/id-fixtures.ts";
import { QuestTasks } from "./task-rows-test-kit.tsx";

const actions = {
  changeTasksAction: vi.fn<typeof changeTasksAction>(),
  runChatCommandAction: vi.fn<typeof runChatCommandAction>(),
  undoTasksChangeAction: vi.fn<typeof undoTasksChangeAction>(),
};

// The task list's Server Actions, as the page hands them to its client
// components.
const TASKS_ACTIONS: TasksActions = {
  change: actions.changeTasksAction,
  undo: actions.undoTasksChangeAction,
  command: actions.runChatCommandAction,
};

const QUEST_ID = questIdFixture();
const BLOCK_OUT = "Block out the body and wings";
const SCULPT = "Sculpt the feather plates";
const BRASS = "Sculpt the brass plates";

const TASKS: TasksState = {
  version: 2,
  tasks: {
    items: [
      { number: 1, text: BLOCK_OUT, done: false },
      { number: 2, text: SCULPT, done: false },
    ],
    nextNumber: 3,
  },
  undone: [],
};

const MOVED: TasksState = {
  version: 3,
  tasks: {
    items: [
      { number: 2, text: SCULPT, done: false },
      { number: 1, text: BLOCK_OUT, done: false },
    ],
    nextNumber: 3,
  },
  undone: [],
};

const RECURRING: TasksState = {
  version: 3,
  tasks: {
    items: [
      { number: 1, text: BLOCK_OUT, done: false },
      { number: 2, text: SCULPT, done: false, recurring: true },
    ],
    nextNumber: 3,
  },
  undone: [],
};

function openTasks(): ReturnType<typeof page.getByRole> {
  return page.getByRole("list", { name: TASKS_COPY.tasksLabel });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_change_tasks", () => {
  test("shows compact task rows with task numbers and actions in their menus", async () => {
    await render(
      <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
    );

    await expect
      .element(page.getByRole("button", { name: TASKS_COPY.addPlaceholder }))
      .toBeVisible();
    expect(page.getByRole("textbox").all()).toHaveLength(0);
    await expect
      .element(openTasks().getByRole("listitem").nth(0))
      .toMatchTextContent(BLOCK_OUT);
    await page
      .getByRole("button", { name: TASKS_COPY.actions(BLOCK_OUT) })
      .click();
    await expect.element(page.getByText("#1", { exact: true })).toBeVisible();
    await expect
      .element(
        page.getByRole("menuitem", { name: TASKS_COPY.moveUp(BLOCK_OUT) }),
      )
      .toBeDisabled();
  });

  test("moving a task saves it and shows the change with Undo", async () => {
    actions.changeTasksAction.mockResolvedValue({
      kind: "changed",
      version: MOVED.version,
      lines: [{ kind: "move", text: SCULPT, before: BLOCK_OUT }],
      state: MOVED,
    });
    actions.undoTasksChangeAction.mockResolvedValue({
      kind: "changed",
      version: MOVED.version + 1,
      lines: [{ kind: "move", text: SCULPT }],
      state: { ...TASKS, version: MOVED.version + 1, undone: [MOVED.version] },
    });
    await render(
      <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
    );

    await page
      .getByRole("button", { name: TASKS_COPY.actions(SCULPT) })
      .click();
    await page
      .getByRole("menuitem", { name: TASKS_COPY.moveUp(SCULPT) })
      .click();

    expect(actions.changeTasksAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: undefined,
      operations: [{ op: "move", task: 2, before: 1 }],
    });
    await expect
      .element(openTasks().getByRole("listitem").nth(0))
      .toMatchTextContent(SCULPT);
    const status = page.getByRole("status");
    await expect
      .element(status)
      .toMatchTextContent(`Moved “${SCULPT}” before “${BLOCK_OUT}”`);

    await userEvent.click(
      status.getByRole("button", { name: TASKS_COPY.undo }),
    );
    expect(actions.undoTasksChangeAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: undefined,
      version: MOVED.version,
    });
    await expect
      .element(openTasks().getByRole("listitem").nth(0))
      .toMatchTextContent(BLOCK_OUT);
  });

  test.each(["pointer", "keyboard"])(
    "reorders tasks with the %s drag handle",
    async (method) => {
      actions.changeTasksAction.mockResolvedValue({
        kind: "changed",
        version: MOVED.version,
        lines: [{ kind: "move", text: SCULPT, before: BLOCK_OUT }],
        state: MOVED,
      });
      await render(
        <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
      );
      const handle = page.getByRole("button", { name: `Reorder “${SCULPT}”` });
      if (method === "pointer") {
        await userEvent.dragAndDrop(
          handle,
          page.getByRole("button", { name: TASKS_COPY.edit(BLOCK_OUT) }),
          { targetPosition: { x: 1, y: 1 } },
        );
      } else {
        handle.element().focus();
        await userEvent.keyboard("{ArrowUp}");
      }
      expect(actions.changeTasksAction).toHaveBeenCalledWith({
        questId: QUEST_ID,
        chatId: undefined,
        operations: [{ op: "move", task: 2, before: 1 }],
      });
      await expect
        .element(openTasks().getByRole("listitem").nth(0))
        .toMatchTextContent(SCULPT);
      await expect.element(handle).toHaveFocus();
    },
  );

  test("a failed save keeps the inline draft and Escape cancels it", async () => {
    actions.changeTasksAction.mockRejectedValueOnce(new Error("Offline"));
    await render(
      <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
    );
    await page.getByRole("button", { name: TASKS_COPY.edit(SCULPT) }).click();
    const input = page.getByRole("textbox", { name: TASKS_COPY.textLabel });
    await expect.element(input).toHaveFocus();
    await input.fill(BRASS);
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(TASKS_COPY.failed["not-saved"]);
    await expect.element(input).toHaveValue(BRASS);
    await userEvent.keyboard("{Escape}");
    await expect
      .element(page.getByRole("button", { name: TASKS_COPY.edit(SCULPT) }))
      .toHaveFocus();
    await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
  });

  test("editing a task saves its new text, and an empty one says why", async () => {
    actions.changeTasksAction.mockResolvedValue({
      kind: "changed",
      version: MOVED.version,
      lines: [{ kind: "change", text: BRASS, from: SCULPT }],
      state: {
        ...TASKS,
        version: MOVED.version,
        tasks: {
          ...TASKS.tasks,
          items: [
            { number: 1, text: BLOCK_OUT, done: false },
            { number: 2, text: BRASS, done: false },
          ],
        },
      },
    });
    await render(
      <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
    );

    await userEvent.click(
      page.getByRole("button", { name: TASKS_COPY.edit(SCULPT) }),
    );
    const field = page.getByRole("textbox", { name: TASKS_COPY.textLabel });
    await userEvent.clear(field);
    await userEvent.click(page.getByRole("button", { name: TASKS_COPY.save }));
    await expect.element(page.getByText(TASKS_COPY.needsText)).toBeVisible();
    expect(actions.changeTasksAction).not.toHaveBeenCalled();

    await userEvent.fill(field, BRASS);
    await userEvent.click(page.getByRole("button", { name: TASKS_COPY.save }));
    expect(actions.changeTasksAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: undefined,
      operations: [{ op: "change", task: 2, text: BRASS }],
    });
    await expect.element(openTasks()).toMatchTextContent(BRASS);
  });

  test("a change that couldn't be saved is an alert, and a refused one a routine status", async () => {
    actions.changeTasksAction.mockRejectedValueOnce(new Error("Offline"));
    await render(
      <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
    );
    const moveUp = page.getByRole("menuitem", {
      name: TASKS_COPY.moveUp(SCULPT),
    });

    await page
      .getByRole("button", { name: TASKS_COPY.actions(SCULPT) })
      .click();
    await userEvent.click(moveUp);
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(TASKS_COPY.failed["not-saved"]);
    await expect.element(page.getByRole("status")).toHaveTextContent("");

    actions.changeTasksAction.mockResolvedValueOnce({
      kind: "failed",
      reason: "missing-task",
      state: TASKS,
    });
    await page
      .getByRole("button", { name: TASKS_COPY.actions(SCULPT) })
      .click();
    await userEvent.click(moveUp);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(TASKS_COPY.failed["missing-task"]);
    await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
  });
});

const OUTSIDE_TASKS = "Another field";

test("clicking outside a Tasks task saves and closes its edit without stealing focus", async () => {
  const updated: TasksState = {
    ...TASKS,
    version: TASKS.version + 1,
    tasks: {
      ...TASKS.tasks,
      items: [
        TASKS.tasks.items[0],
        { number: 2, text: BRASS, done: false },
      ].filter((task) => task !== undefined),
    },
  };
  actions.changeTasksAction.mockResolvedValue({
    kind: "changed",
    version: updated.version,
    lines: [{ kind: "change", text: BRASS, from: SCULPT }],
    state: updated,
  });
  await render(
    <>
      <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />
      <input aria-label={OUTSIDE_TASKS} />
    </>,
  );
  await page.getByRole("button", { name: TASKS_COPY.edit(SCULPT) }).click();
  await page.getByRole("textbox", { name: TASKS_COPY.textLabel }).fill(BRASS);
  const outside = page.getByRole("textbox", { name: OUTSIDE_TASKS });
  await outside.click();
  await expect
    .element(page.getByRole("textbox", { name: TASKS_COPY.textLabel }))
    .not.toBeInTheDocument();
  expect(actions.changeTasksAction).toHaveBeenCalledExactlyOnceWith({
    questId: QUEST_ID,
    chatId: undefined,
    operations: [{ op: "change", task: 2, text: BRASS }],
  });
  await expect
    .element(page.getByRole("button", { name: TASKS_COPY.edit(BRASS) }))
    .toBeVisible();
  await expect.element(outside).toHaveFocus();
});

test("Add a task puts the new task after the existing tasks, as /add does", async () => {
  const updated: TasksState = {
    version: TASKS.version + 1,
    tasks: {
      items: [...TASKS.tasks.items, { number: 3, text: BRASS, done: false }],
      nextNumber: 4,
    },
    undone: [],
  };
  actions.changeTasksAction.mockResolvedValue({
    kind: "changed",
    version: updated.version,
    lines: [{ kind: "add", text: BRASS }],
    state: updated,
  });
  await render(
    <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
  );
  await page.getByRole("button", { name: TASKS_COPY.addPlaceholder }).click();
  await page.getByRole("textbox", { name: TASKS_COPY.addLabel }).fill(BRASS);
  await userEvent.keyboard("{Enter}");
  expect(actions.changeTasksAction).toHaveBeenCalledExactlyOnceWith({
    questId: QUEST_ID,
    chatId: undefined,
    operations: [{ op: "add", text: BRASS }],
  });
  await expect
    .element(openTasks().getByRole("listitem").last())
    .toMatchTextContent(BRASS);
});

describe("use_case_recurring_tasks", () => {
  test("in Dailies, a task's menu makes it recurring, and it shows as recurring", async () => {
    actions.changeTasksAction.mockResolvedValue({
      kind: "changed",
      version: RECURRING.version,
      lines: [{ kind: "recur", text: SCULPT, recurring: true }],
      state: RECURRING,
    });
    await render(
      <QuestTasks
        questId={QUEST_ID}
        tasks={TASKS}
        actions={TASKS_ACTIONS}
        days={[]}
      />,
    );

    await page
      .getByRole("button", { name: TASKS_COPY.actions(SCULPT) })
      .click();
    await page
      .getByRole("menuitem", { name: TASKS_COPY.makeRecurring(SCULPT) })
      .click();

    expect(actions.changeTasksAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: undefined,
      operations: [{ op: "recur", task: 2, recurring: true }],
    });
    await expect
      .element(page.getByRole("status"))
      .toMatchTextContent(`Made “${SCULPT}” recurring`);
    await expect
      .element(page.getByText(TASKS_COPY.recurringNoStreak))
      .toBeInTheDocument();

    await page
      .getByRole("button", { name: TASKS_COPY.actions(SCULPT) })
      .click();
    await expect
      .element(
        page.getByRole("menuitem", { name: TASKS_COPY.makeOneOff(SCULPT) }),
      )
      .toBeVisible();
  });

  test("outside Dailies, a task's menu can't make it recurring", async () => {
    await render(
      <QuestTasks questId={QUEST_ID} tasks={TASKS} actions={TASKS_ACTIONS} />,
    );

    await page
      .getByRole("button", { name: TASKS_COPY.actions(SCULPT) })
      .click();
    await expect
      .element(page.getByRole("menuitem", { name: TASKS_COPY.moveUp(SCULPT) }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("menuitem", { name: TASKS_COPY.makeRecurring(SCULPT) }),
      )
      .not.toBeInTheDocument();
  });
});
