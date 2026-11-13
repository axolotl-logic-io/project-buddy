// The quest's plan in an adventure, in Chromium and WebKit: "/" in the
// composer lists the built-in commands, and the mock model's while it runs; a
// plan command runs without the construct and shows its change in the
// conversation; the Plan panel changes the plan from beside it; and the
// construct's change shows with Undo. What the actions save is
// plan.server.test.ts's.

import type { UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { ChatView } from "@/components/chat-view.tsx";
import type { PlanActions } from "@/components/plan/use-plan.ts";
import { QuestStatusFeedback } from "@/components/quest-status-controls.tsx";
import { getConstruct } from "@/constructs/index.ts";
import type { PlanState } from "@/plan/plan.ts";
import type {
  changePlanAction,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { planCardMessage, planChangeMessage } from "@/plan/plan-message.ts";
import { CHANGE_PLAN_TOOL } from "@/replies/tools/change-plan-contract.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  CHAT_COMMANDS_COPY,
  PLAN_CHANGE_COPY,
  PLAN_COPY,
  PLAN_PANEL_COPY,
} from "@/ui/copy/plan.ts";
import {
  chatIdFixture,
  questIdFixture,
  userIdFixture,
} from "../../../support/id-fixtures.ts";
import { answerChat } from "../chat-stream-test-kit.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const actions = {
  changePlanAction: vi.fn<typeof changePlanAction>(),
  runChatCommandAction: vi.fn<typeof runChatCommandAction>(),
  undoPlanChangeAction: vi.fn<typeof undoPlanChangeAction>(),
};

// The plan's Server Actions, as the page hands them to its client
// components.
const PLAN_ACTIONS: PlanActions = {
  change: actions.changePlanAction,
  undo: actions.undoPlanChangeAction,
  command: actions.runChatCommandAction,
};

const CHAT_ID = chatIdFixture();
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const QUEST_ID = questIdFixture();
const BLOCK_OUT = "Block out the body and wings";
const SCULPT = "Sculpt the feather plates";

const PLAN: PlanState = {
  version: 2,
  plan: {
    steps: [
      { number: 1, text: BLOCK_OUT, done: false },
      { number: 2, text: SCULPT, done: false },
    ],
    nextNumber: 3,
  },
  undone: [],
};

const DONE_PLAN: PlanState = {
  version: 3,
  plan: {
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
        initialPlan={PLAN}
        planActions={PLAN_ACTIONS}
      />
    </QuestStatusFeedback>,
  );
}

// A standalone adventure: no quest and no plan, though the page still hands
// over the plan's actions, which run the commands.
async function openStandaloneChat(): Promise<void> {
  await render(
    <ChatView
      chatId={CHAT_ID}
      viewer={userIdFixture()}
      constructName={getConstruct("vellum").name}
      initialMessages={[]}
      planActions={PLAN_ACTIONS}
    />,
  );
}

// A quest adventure whose last message has no reply, with the Plan panel
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
          parts: [{ type: "text", text: "Help me plan the wings" }],
        },
      ]}
      stoppedReplyId={stoppedReplyId}
      questId={QUEST_ID}
      initialPlan={PLAN}
      planActions={PLAN_ACTIONS}
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

describe("use_case_plan_commands", () => {
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

  test("a plan command runs without the construct and shows its change", async () => {
    const fetchMock = answerChat(new Response(null));
    actions.runChatCommandAction.mockResolvedValue({
      kind: "changed",
      version: DONE_PLAN.version,
      lines: [{ kind: "complete", text: BLOCK_OUT }],
      state: DONE_PLAN,
      message: planChangeMessage("p1", {
        version: DONE_PLAN.version,
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
      name: PLAN_CHANGE_COPY.label,
    });
    await expect
      .element(change)
      .toMatchTextContent(`Checked off “${BLOCK_OUT}”`);
    await expect.element(change).toMatchTextContent(PLAN_CHANGE_COPY.noModel);
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
      text: "The plan has no step 9.",
    });
    await openChat();
    await userEvent.type(messageBox(), "/done 9{Enter}");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("The plan has no step 9.");
    await expect.element(messageBox()).toHaveValue("/done 9");
  });

  test("in an adventure with no quest, any other /word goes to the construct", async () => {
    const fetchMock = answerChat(new Response(null));
    await openStandaloneChat();
    await userEvent.type(messageBox(), "/");
    await expect.element(commandList()).not.toBeInTheDocument();

    await userEvent.type(messageBox(), "shrug ok let's go{Enter}");

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(actions.runChatCommandAction).not.toHaveBeenCalled();
  });

  test("in an adventure with no quest, a plan command says it needs a quest", async () => {
    const fetchMock = answerChat(new Response(null));
    actions.runChatCommandAction.mockResolvedValue({
      kind: "problem",
      text: CHAT_COMMANDS_COPY.noPlan,
    });
    await openStandaloneChat();
    await userEvent.type(messageBox(), "/add Sketch wings{Enter}");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(CHAT_COMMANDS_COPY.noPlan);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("use_case_plan_panel", () => {
  test("waits, saying why, while the last message's reply stopped, so it can still be sent again", async () => {
    await openAwaitingChat("m1");
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    const panel = page.getByRole("complementary", {
      name: "Quest side menu",
      exact: true,
    });

    await expect.element(panel).toMatchTextContent(PLAN_PANEL_COPY.unanswered);
    await expect
      .element(
        panel.getByRole("checkbox", { name: PLAN_COPY.checkOff(BLOCK_OUT) }),
      )
      .toBeDisabled();
    await expect
      .element(panel.getByRole("button", { name: PLAN_COPY.addPlaceholder }))
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
      .toMatchTextContent(PLAN_PANEL_COPY.busy(getConstruct("vellum").name));
    await expect
      .element(
        panel.getByRole("checkbox", { name: PLAN_COPY.checkOff(BLOCK_OUT) }),
      )
      .toBeDisabled();
  });

  test("shows the next step and changes the plan from beside the conversation", async () => {
    actions.changePlanAction.mockResolvedValue({
      kind: "changed",
      version: DONE_PLAN.version,
      lines: [{ kind: "complete", text: BLOCK_OUT }],
      state: DONE_PLAN,
      message: planChangeMessage("p1", {
        version: DONE_PLAN.version,
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
      .element(panel.getByRole("button", { name: PLAN_COPY.edit(BLOCK_OUT) }))
      .toBeVisible();
    await userEvent.click(
      panel.getByRole("checkbox", { name: PLAN_COPY.checkOff(BLOCK_OUT) }),
    );

    expect(actions.changePlanAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: CHAT_ID,
      operations: [{ op: "complete", step: 1 }],
    });
    await expect
      .element(panel.getByRole("list", { name: PLAN_COPY.stepsLabel }))
      .not.toHaveTextContent(BLOCK_OUT);
    await expect
      .element(panel.getByRole("status"))
      .toMatchTextContent(`Checked off “${BLOCK_OUT}”`);
    actions.undoPlanChangeAction.mockResolvedValue({
      kind: "changed",
      version: DONE_PLAN.version + 1,
      lines: [{ kind: "reopen", text: BLOCK_OUT }],
      state: {
        ...PLAN,
        version: DONE_PLAN.version + 1,
        undone: [DONE_PLAN.version],
      },
    });
    await panel
      .getByRole("button", { name: PLAN_COPY.undo, exact: true })
      .click();
    await expect
      .element(
        panel.getByRole("checkbox", { name: PLAN_COPY.checkOff(BLOCK_OUT) }),
      )
      .not.toBeChecked();
    await expect
      .element(panel.getByRole("status"))
      .toMatchTextContent(`Reopened “${BLOCK_OUT}”`);
    await page.getByRole("button", { name: "Collapse quest sidebar" }).click();
    await expect
      .element(
        page.getByRole("complementary", { name: PLAN_CHANGE_COPY.label }),
      )
      .not.toBeInTheDocument();
    const history = page.getByRole("list", {
      name: CHAT_COPY.conversationLabel,
    });
    expect(history.getByRole("listitem").all()).toHaveLength(0);
  });

  test("inline editing, dragging and row menus work inside the phone drawer", async () => {
    await page.viewport(PHONE_WIDTH, PHONE_HEIGHT);
    const moved: PlanState = {
      ...PLAN,
      version: PLAN.version + 1,
      plan: {
        ...PLAN.plan,
        steps: [PLAN.plan.steps[1], PLAN.plan.steps[0]].filter(
          (step) => step !== undefined,
        ),
      },
    };
    actions.changePlanAction.mockResolvedValue({
      kind: "changed",
      version: moved.version,
      lines: [{ kind: "move", text: SCULPT, before: BLOCK_OUT }],
      state: moved,
    });
    await openChat();
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    const panel = page.getByRole("dialog", { name: "Quest side menu" });
    await panel
      .getByRole("button", { name: PLAN_COPY.edit(BLOCK_OUT) })
      .click();
    await expect
      .element(panel.getByRole("textbox", { name: PLAN_COPY.textLabel }))
      .toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.element(panel).toBeVisible();
    await userEvent.dragAndDrop(
      panel.getByRole("button", { name: `Reorder “${SCULPT}”` }),
      panel.getByRole("button", { name: PLAN_COPY.edit(BLOCK_OUT) }),
      { targetPosition: { x: 1, y: 1 } },
    );
    await expect
      .element(
        panel
          .getByRole("list", { name: PLAN_COPY.stepsLabel })
          .getByRole("listitem")
          .first(),
      )
      .toMatchTextContent(SCULPT);
    await panel
      .getByRole("button", { name: PLAN_COPY.actions(SCULPT) })
      .click();
    await expect
      .element(page.getByRole("menuitem", { name: PLAN_COPY.moveUp(SCULPT) }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("menuitem", { name: PLAN_COPY.moveDown(SCULPT) }))
      .toBeVisible();
    await page
      .getByRole("menuitem", { name: PLAN_COPY.moveDown(SCULPT) })
      .click();
    expect(actions.changePlanAction).toHaveBeenLastCalledWith({
      questId: QUEST_ID,
      chatId: CHAT_ID,
      operations: [{ op: "move", step: 2 }],
    });
  });

  test("the construct's change shows in the conversation, and Undo undoes it", async () => {
    actions.undoPlanChangeAction.mockResolvedValue({
      kind: "changed",
      version: DONE_PLAN.version + 1,
      lines: [{ kind: "reopen", text: BLOCK_OUT }],
      state: {
        ...PLAN,
        version: DONE_PLAN.version + 1,
        undone: [DONE_PLAN.version],
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
            type: `tool-${CHANGE_PLAN_TOOL}`,
            toolCallId: "call-plan",
            state: "output-available",
            input: { operations: [{ op: "complete", step: 1 }] },
            output: {
              status: "changed",
              questId: QUEST_ID,
              version: DONE_PLAN.version,
              lines: [{ kind: "complete", text: BLOCK_OUT }],
              plan: DONE_PLAN.plan,
            },
          },
        ],
      },
    ]);
    const change = page.getByRole("complementary", {
      name: PLAN_CHANGE_COPY.label,
    });
    await expect
      .element(change)
      .toMatchTextContent(`Checked off “${BLOCK_OUT}”`);

    await userEvent.click(
      change.getByRole("button", { name: PLAN_CHANGE_COPY.undoLabel }),
    );

    expect(actions.undoPlanChangeAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: CHAT_ID,
      version: DONE_PLAN.version,
    });
    await expect.element(change).toMatchTextContent(PLAN_CHANGE_COPY.undone);
  });
});

test("saved Plan cards point to the side menu without inline form controls", async () => {
  await openChat([planCardMessage("legacy-plan-card", { command: "/plan" })]);
  await page.getByRole("button", { name: "Open quest sidebar" }).click();
  await expect.element(page.getByText(PLAN_CHANGE_COPY.sideMenu)).toBeVisible();
  const history = page.getByRole("list", { name: CHAT_COPY.conversationLabel });
  await expect.element(history.getByRole("textbox")).not.toBeInTheDocument();
  await expect
    .element(
      page
        .getByRole("complementary", { name: "Quest side menu" })
        .getByRole("button", { name: PLAN_COPY.addPlaceholder }),
    )
    .toBeVisible();
});
