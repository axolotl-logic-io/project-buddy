// The quest's tasks in an adventure, in Chromium and WebKit: "/" in the
// composer lists the built-in commands, and the construct's while it runs; a
// tasks command runs without the construct and shows its change in the
// conversation; the Tasks panel changes the tasks from beside it; and the
// construct's change shows with Undo. What the actions save is
// tasks.server.test.ts's.

import type { UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { QuestStatusFeedback } from "@/components/quest-status-controls.tsx";
import type { TasksActions } from "@/components/tasks/use-tasks.ts";
import { getConstruct } from "@/constructs/index.ts";
import { CHANGE_TASKS_TOOL } from "@/replies/tools/change-tasks-contract.ts";
import type { TasksState } from "@/tasks/tasks.ts";
import type {
  changeTasksAction,
  runChatCommandAction,
  undoTasksChangeAction,
} from "@/tasks/tasks-actions.ts";
import { tasksCardMessage, tasksChangeMessage } from "@/tasks/tasks-message.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  CHAT_COMMANDS_COPY,
  TASKS_CHANGE_COPY,
  TASKS_COPY,
  TASKS_PANEL_COPY,
} from "@/ui/copy/tasks.ts";
import {
  chatIdFixture,
  questIdFixture,
  userIdFixture,
} from "../../../support/id-fixtures.ts";
import { answerChat } from "../chat-stream-test-kit.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

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

const CHAT_ID = chatIdFixture();
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const QUEST_ID = questIdFixture();
const BLOCK_OUT = "Block out the body and wings";
const SCULPT = "Sculpt the feather plates";

const TASKS: TasksState = {
  version: 2,
  tasks: {
    steps: [
      { number: 1, text: BLOCK_OUT, done: false },
      { number: 2, text: SCULPT, done: false },
    ],
    nextNumber: 3,
  },
  undone: [],
};

const DONE_TASKS: TasksState = {
  version: 3,
  tasks: {
    steps: [
      { number: 1, text: BLOCK_OUT, done: true },
      { number: 2, text: SCULPT, done: false },
    ],
    nextNumber: 3,
  },
  undone: [],
};

async function openChat(initialMessages: UIMessage[] = []): Promise<void> {
  await render(
    <QuestStatusFeedback>
      <ChatView
        chatId={CHAT_ID}
        viewer={userIdFixture()}
        constructName={getConstruct("vellum").name}
        initialMessages={initialMessages}
        questId={QUEST_ID}
        initialTasks={TASKS}
        tasksActions={TASKS_ACTIONS}
      />
    </QuestStatusFeedback>,
  );
}

// A quest adventure whose last message has no reply, with the Tasks panel
// open at a phone's width: its reply stopped, or, without stoppedReplyId,
// is being made elsewhere.
async function openAwaitingChat(stoppedReplyId?: string): Promise<void> {
  await page.viewport(PHONE_WIDTH, PHONE_HEIGHT);
  await render(
    <ChatView
      chatId={CHAT_ID}
      viewer={userIdFixture()}
      constructName={getConstruct("vellum").name}
      initialMessages={[
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "Help me tasks the wings" }],
        },
      ]}
      stoppedReplyId={stoppedReplyId}
      questId={QUEST_ID}
      initialTasks={TASKS}
      tasksActions={TASKS_ACTIONS}
    />,
  );
}

function messageBox(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
}

function commandList(): ReturnType<typeof page.getByRole> {
  return page.getByRole("listbox", { name: CHAT_COMMANDS_COPY.listLabel });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("use_case_tasks_commands", () => {
  test('"/" lists the built-in commands', async () => {
    await openChat();
    await userEvent.type(messageBox(), "/");

    await expect.element(commandList()).toBeVisible();
    const list = commandList();
    await expect.element(list).toMatchTextContent("/add TEXT");
    await expect.element(list).toMatchTextContent("/done [STEP]");
    await expect.element(list).toMatchTextContent("/undo");
    await Promise.all(
      ["/complete", "/abandon", "/restore"].map(async (command) => {
        await expect.element(list).toMatchTextContent(command);
      }),
    );

    await userEvent.type(messageBox(), "dr");
    await expect
      .element(commandList().getByRole("option"))
      .toMatchTextContent("/drop STEP");
    await userEvent.keyboard("{Tab}");
    await expect.element(messageBox()).toHaveValue("/drop ");
    await expect.element(commandList()).not.toBeInTheDocument();
  });

  test("a tasks command runs without the construct and shows its change", async () => {
    const fetchMock = answerChat(new Response(null));
    actions.runChatCommandAction.mockResolvedValue({
      kind: "changed",
      version: DONE_TASKS.version,
      lines: [{ kind: "complete", text: BLOCK_OUT }],
      state: DONE_TASKS,
      message: tasksChangeMessage("p1", {
        version: DONE_TASKS.version,
        lines: [{ kind: "complete", text: BLOCK_OUT }],
        command: "/done",
      }),
    });
    await openChat();
    await userEvent.type(messageBox(), "/done{Enter}");

    expect(actions.runChatCommandAction).toHaveBeenCalledWith({
      chatId: CHAT_ID,
      text: "/done",
    });
    const change = page.getByRole("complementary", {
      name: TASKS_CHANGE_COPY.label,
    });
    await expect
      .element(change)
      .toMatchTextContent(`Checked off “${BLOCK_OUT}”`);
    await expect.element(change).toMatchTextContent(TASKS_CHANGE_COPY.noModel);
    await expect.element(messageBox()).toHaveValue("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([
    ["/complete", "completed"],
    ["/abandon", "abandoned"],
    ["/restore", "active"],
  ] as const)(
    "%s changes quest status without a construct reply and offers Undo",
    async (command, toStatus) => {
      const fetchMock = answerChat(new Response(null));
      actions.runChatCommandAction.mockResolvedValue({
        kind: "quest-status",
        feedback: {
          kind: "saved",
          message: "Quest status changed.",
          change: {
            questId: QUEST_ID,
            fromStatus: "active",
            toStatus,
            revision: 1,
          },
        },
      });
      await openChat();
      await userEvent.type(messageBox(), `${command}{Enter}`);
      expect(actions.runChatCommandAction).toHaveBeenCalledWith({
        chatId: CHAT_ID,
        text: command,
      });
      await expect
        .element(page.getByText("Quest status changed.", { exact: true }))
        .toHaveFocus();
      await expect.element(messageBox()).toHaveValue("");
      expect(fetchMock).not.toHaveBeenCalled();
      vi.mocked(changeQuestStatusAction).mockResolvedValue({
        kind: "saved",
        message: "Quest restored.",
      });
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect
        .element(page.getByText("Quest restored.", { exact: true }))
        .toHaveFocus();
    },
  );

  test("a command with a problem keeps its text and says why", async () => {
    actions.runChatCommandAction.mockResolvedValue({
      kind: "problem",
      text: "There is no task 9.",
    });
    await openChat();
    await userEvent.type(messageBox(), "/done 9{Enter}");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("There is no task 9.");
    await expect.element(messageBox()).toHaveValue("/done 9");
  });
});

describe("use_case_tasks_panel", () => {
  test("waits, saying why, while the last message's reply stopped, so it can still be sent again", async () => {
    await openAwaitingChat("m1");
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    const panel = page.getByRole("complementary", {
      name: "Quest side menu",
      exact: true,
    });

    await expect.element(panel).toMatchTextContent(TASKS_PANEL_COPY.unanswered);
    await expect
      .element(
        panel.getByRole("checkbox", { name: TASKS_COPY.checkOff(BLOCK_OUT) }),
      )
      .toBeDisabled();
    await expect
      .element(panel.getByRole("button", { name: TASKS_COPY.addPlaceholder }))
      .toBeDisabled();
  });

  test("waits while a reply is made elsewhere, such as for another member", async () => {
    await openAwaitingChat();
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    const panel = page.getByRole("complementary", {
      name: "Quest side menu",
      exact: true,
    });

    await expect
      .element(panel)
      .toMatchTextContent(TASKS_PANEL_COPY.busy(getConstruct("vellum").name));
    await expect
      .element(
        panel.getByRole("checkbox", { name: TASKS_COPY.checkOff(BLOCK_OUT) }),
      )
      .toBeDisabled();
  });

  test("shows the next step and changes the tasks from beside the conversation", async () => {
    actions.changeTasksAction.mockResolvedValue({
      kind: "changed",
      version: DONE_TASKS.version,
      lines: [{ kind: "complete", text: BLOCK_OUT }],
      state: DONE_TASKS,
      message: tasksChangeMessage("p1", {
        version: DONE_TASKS.version,
        lines: [{ kind: "complete", text: BLOCK_OUT }],
      }),
    });
    // A phone's width, where a button above the conversation opens the panel.
    await page.viewport(PHONE_WIDTH, PHONE_HEIGHT);
    await openChat();
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    const panel = page.getByRole("complementary", {
      name: "Quest side menu",
      exact: true,
    });

    await expect
      .element(panel.getByRole("button", { name: TASKS_COPY.edit(BLOCK_OUT) }))
      .toBeVisible();
    await userEvent.click(
      panel.getByRole("checkbox", { name: TASKS_COPY.checkOff(BLOCK_OUT) }),
    );

    expect(actions.changeTasksAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: CHAT_ID,
      operations: [{ op: "complete", step: 1 }],
    });
    await expect
      .element(panel.getByRole("list", { name: TASKS_COPY.stepsLabel }))
      .not.toHaveTextContent(BLOCK_OUT);
    await expect
      .element(panel.getByRole("status"))
      .toMatchTextContent(`Checked off “${BLOCK_OUT}”`);
    actions.undoTasksChangeAction.mockResolvedValue({
      kind: "changed",
      version: DONE_TASKS.version + 1,
      lines: [{ kind: "reopen", text: BLOCK_OUT }],
      state: {
        ...TASKS,
        version: DONE_TASKS.version + 1,
        undone: [DONE_TASKS.version],
      },
    });
    await panel
      .getByRole("button", { name: TASKS_COPY.undo, exact: true })
      .click();
    await expect
      .element(
        panel.getByRole("checkbox", { name: TASKS_COPY.checkOff(BLOCK_OUT) }),
      )
      .not.toBeChecked();
    await expect
      .element(panel.getByRole("status"))
      .toMatchTextContent(`Reopened “${BLOCK_OUT}”`);
    await page.getByRole("button", { name: "Collapse quest sidebar" }).click();
    await expect
      .element(
        page.getByRole("complementary", { name: TASKS_CHANGE_COPY.label }),
      )
      .not.toBeInTheDocument();
    const history = page.getByRole("list", {
      name: CHAT_COPY.conversationLabel,
    });
    expect(history.getByRole("listitem").all()).toHaveLength(0);
  });

  test("inline editing, dragging and row menus work inside the phone drawer", async () => {
    await page.viewport(PHONE_WIDTH, PHONE_HEIGHT);
    const moved: TasksState = {
      ...TASKS,
      version: TASKS.version + 1,
      tasks: {
        ...TASKS.tasks,
        steps: [TASKS.tasks.steps[1], TASKS.tasks.steps[0]].filter(
          (step) => step !== undefined,
        ),
      },
    };
    actions.changeTasksAction.mockResolvedValue({
      kind: "changed",
      version: moved.version,
      lines: [{ kind: "move", text: SCULPT, before: BLOCK_OUT }],
      state: moved,
    });
    await openChat();
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    const panel = page.getByRole("dialog", { name: "Quest side menu" });
    await panel
      .getByRole("button", { name: TASKS_COPY.edit(BLOCK_OUT) })
      .click();
    await expect
      .element(panel.getByRole("textbox", { name: TASKS_COPY.textLabel }))
      .toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.element(panel).toBeVisible();
    await userEvent.dragAndDrop(
      panel.getByRole("button", { name: `Reorder “${SCULPT}”` }),
      panel.getByRole("button", { name: TASKS_COPY.edit(BLOCK_OUT) }),
      { targetPosition: { x: 1, y: 1 } },
    );
    await expect
      .element(
        panel
          .getByRole("list", { name: TASKS_COPY.stepsLabel })
          .getByRole("listitem")
          .first(),
      )
      .toMatchTextContent(SCULPT);
    await panel
      .getByRole("button", { name: TASKS_COPY.actions(SCULPT) })
      .click();
    await expect
      .element(page.getByRole("menuitem", { name: TASKS_COPY.moveUp(SCULPT) }))
      .toBeDisabled();
    await expect
      .element(
        page.getByRole("menuitem", { name: TASKS_COPY.moveDown(SCULPT) }),
      )
      .toBeVisible();
    await page
      .getByRole("menuitem", { name: TASKS_COPY.moveDown(SCULPT) })
      .click();
    expect(actions.changeTasksAction).toHaveBeenLastCalledWith({
      questId: QUEST_ID,
      chatId: CHAT_ID,
      operations: [{ op: "move", step: 2 }],
    });
  });

  test("the construct's change shows in the conversation, and Undo undoes it", async () => {
    actions.undoTasksChangeAction.mockResolvedValue({
      kind: "changed",
      version: DONE_TASKS.version + 1,
      lines: [{ kind: "reopen", text: BLOCK_OUT }],
      state: {
        ...TASKS,
        version: DONE_TASKS.version + 1,
        undone: [DONE_TASKS.version],
      },
    });
    await openChat([
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Finished the blockout!" }],
      },
      {
        id: "r1",
        role: "assistant",
        parts: [
          { type: "text", text: "Inked in." },
          {
            type: `tool-${CHANGE_TASKS_TOOL}`,
            toolCallId: "call-tasks",
            state: "output-available",
            input: { operations: [{ op: "complete", step: 1 }] },
            output: {
              status: "changed",
              questId: QUEST_ID,
              version: DONE_TASKS.version,
              lines: [{ kind: "complete", text: BLOCK_OUT }],
              tasks: DONE_TASKS.tasks,
            },
          },
        ],
      },
    ]);
    const change = page.getByRole("complementary", {
      name: TASKS_CHANGE_COPY.label,
    });
    await expect
      .element(change)
      .toMatchTextContent(`Checked off “${BLOCK_OUT}”`);

    await userEvent.click(
      change.getByRole("button", { name: TASKS_CHANGE_COPY.undoLabel }),
    );

    expect(actions.undoTasksChangeAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: CHAT_ID,
      version: DONE_TASKS.version,
    });
    await expect.element(change).toMatchTextContent(TASKS_CHANGE_COPY.undone);
  });
});

test("saved Tasks cards point to the side menu without inline form controls", async () => {
  await openChat([
    tasksCardMessage("legacy-tasks-card", { command: "/tasks" }),
  ]);
  await page.getByRole("button", { name: "Open quest sidebar" }).click();
  await expect
    .element(page.getByText(TASKS_CHANGE_COPY.sideMenu))
    .toBeVisible();
  const history = page.getByRole("list", { name: CHAT_COPY.conversationLabel });
  await expect.element(history.getByRole("textbox")).not.toBeInTheDocument();
  await expect
    .element(
      page
        .getByRole("complementary", { name: "Quest side menu" })
        .getByRole("button", { name: TASKS_COPY.addPlaceholder }),
    )
    .toBeVisible();
});
