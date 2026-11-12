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
import type { CommandListing } from "@/components/chat/chat-commands.ts";
import { ChatView } from "@/components/chat-view.tsx";
import type { PlanActions } from "@/components/plan/use-plan.ts";
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

const MOCK_COMMANDS: readonly CommandListing[] = [
  {
    command: "/mock-markdown",
    usage: "/mock-markdown",
    description: "replies with every kind of Markdown",
  },
];

async function openChat(
  initialMessages: UIMessage[] = [],
  mockCommands: readonly CommandListing[] = [],
): Promise<void> {
  await render(
    <ChatView
      chatId={CHAT_ID}
      viewer={userIdFixture()}
      constructName={getConstruct("vellum").name}
      initialMessages={initialMessages}
      questId={QUEST_ID}
      initialPlan={PLAN}
      planActions={PLAN_ACTIONS}
      mockCommands={mockCommands}
    />,
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
  test('"/" lists the built-in commands, and the mock model\'s while it runs', async () => {
    await openChat([], MOCK_COMMANDS);
    await userEvent.type(messageBox(), "/");

    await expect.element(commandList()).toBeVisible();
    const list = commandList();
    await expect.element(list).toMatchTextContent("/add TEXT");
    await expect.element(list).toMatchTextContent("/done [STEP]");
    await expect.element(list).toMatchTextContent("/undo");
    await expect.element(list).toMatchTextContent("/mock-markdown");

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

  test("the mock model's commands go to the construct", async () => {
    const fetchMock = answerChat(new Response(null));
    await openChat([], MOCK_COMMANDS);
    await userEvent.type(messageBox(), "/mock-markdown ");
    await userEvent.click(page.getByRole("button", { name: CHAT_COPY.send }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(actions.runChatCommandAction).not.toHaveBeenCalled();
  });
});

describe("use_case_plan_panel", () => {
  test("waits, saying why, while the last message's reply stopped, so it can still be sent again", async () => {
    await openAwaitingChat("m1");
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
      .element(panel.getByRole("button", { name: PLAN_COPY.add }))
      .toBeDisabled();
  });

  test("waits while a reply is made elsewhere, such as for another member", async () => {
    await openAwaitingChat();
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
    const panel = page.getByRole("complementary", {
      name: "Quest side menu",
      exact: true,
    });

    await expect.element(panel).toMatchTextContent(PLAN_COPY.nextStep);
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
      .element(
        page.getByRole("complementary", { name: PLAN_CHANGE_COPY.label }),
      )
      .toMatchTextContent(`Checked off “${BLOCK_OUT}”`);
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
  await expect.element(page.getByText(PLAN_CHANGE_COPY.sideMenu)).toBeVisible();
  const history = page.getByRole("list", { name: CHAT_COPY.conversationLabel });
  await expect.element(history.getByRole("textbox")).not.toBeInTheDocument();
  await expect
    .element(
      page
        .getByRole("complementary", { name: "Quest side menu" })
        .getByRole("button", { name: PLAN_COPY.add }),
    )
    .toBeVisible();
});
