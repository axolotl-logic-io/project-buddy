// A quest's plan on its page, in Chromium and WebKit: the next step on its
// own, the open steps with their controls, adding, editing and moving a step
// without the construct, and Undo for the last change. What the actions save
// is plan.server.test.ts's.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestPlan } from "@/app/(workspace)/quests/[questId]/(overview)/quest-plan.tsx";
import type { PlanActions } from "@/components/plan/use-plan.ts";
import type { PlanState } from "@/plan/plan.ts";
import type {
  changePlanAction,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { questIdFixture } from "../../../../../support/id-fixtures.ts";

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

const QUEST_ID = questIdFixture();
const BLOCK_OUT = "Block out the body and wings";
const SCULPT = "Sculpt the feather plates";
const BRASS = "Sculpt the brass plates";

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

const MOVED: PlanState = {
  version: 3,
  plan: {
    steps: [
      { number: 2, text: SCULPT, done: false },
      { number: 1, text: BLOCK_OUT, done: false },
    ],
    nextNumber: 3,
  },
  undone: [],
};

function openSteps(): ReturnType<typeof page.getByRole> {
  return page.getByRole("list", { name: PLAN_COPY.stepsLabel });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_change_plan", () => {
  test("shows compact task rows with step numbers and actions in their menus", async () => {
    await render(
      <QuestPlan questId={QUEST_ID} plan={PLAN} actions={PLAN_ACTIONS} />,
    );

    await expect
      .element(page.getByRole("button", { name: PLAN_COPY.addPlaceholder }))
      .toBeVisible();
    expect(page.getByRole("textbox").all()).toHaveLength(0);
    await expect
      .element(openSteps().getByRole("listitem").nth(0))
      .toMatchTextContent(BLOCK_OUT);
    await page
      .getByRole("button", { name: PLAN_COPY.actions(BLOCK_OUT) })
      .click();
    await expect.element(page.getByText("#1", { exact: true })).toBeVisible();
    await expect
      .element(
        page.getByRole("menuitem", { name: PLAN_COPY.moveUp(BLOCK_OUT) }),
      )
      .toBeDisabled();
  });

  test("moving a step saves it and shows the change with Undo", async () => {
    actions.changePlanAction.mockResolvedValue({
      kind: "changed",
      version: MOVED.version,
      lines: [{ kind: "move", text: SCULPT, before: BLOCK_OUT }],
      state: MOVED,
    });
    actions.undoPlanChangeAction.mockResolvedValue({
      kind: "changed",
      version: MOVED.version + 1,
      lines: [{ kind: "move", text: SCULPT }],
      state: { ...PLAN, version: MOVED.version + 1, undone: [MOVED.version] },
    });
    await render(
      <QuestPlan questId={QUEST_ID} plan={PLAN} actions={PLAN_ACTIONS} />,
    );

    await page.getByRole("button", { name: PLAN_COPY.actions(SCULPT) }).click();
    await page
      .getByRole("menuitem", { name: PLAN_COPY.moveUp(SCULPT) })
      .click();

    expect(actions.changePlanAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: undefined,
      operations: [{ op: "move", step: 2, before: 1 }],
    });
    await expect
      .element(openSteps().getByRole("listitem").nth(0))
      .toMatchTextContent(SCULPT);
    const status = page.getByRole("status");
    await expect
      .element(status)
      .toMatchTextContent(`Moved “${SCULPT}” before “${BLOCK_OUT}”`);

    await userEvent.click(status.getByRole("button", { name: PLAN_COPY.undo }));
    expect(actions.undoPlanChangeAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: undefined,
      version: MOVED.version,
    });
    await expect
      .element(openSteps().getByRole("listitem").nth(0))
      .toMatchTextContent(BLOCK_OUT);
  });

  test.each(["pointer", "keyboard"])(
    "reorders tasks with the %s drag handle",
    async (method) => {
      actions.changePlanAction.mockResolvedValue({
        kind: "changed",
        version: MOVED.version,
        lines: [{ kind: "move", text: SCULPT, before: BLOCK_OUT }],
        state: MOVED,
      });
      await render(
        <QuestPlan questId={QUEST_ID} plan={PLAN} actions={PLAN_ACTIONS} />,
      );
      const handle = page.getByRole("button", { name: `Reorder “${SCULPT}”` });
      if (method === "pointer") {
        await userEvent.dragAndDrop(
          handle,
          page.getByRole("button", { name: PLAN_COPY.edit(BLOCK_OUT) }),
          { targetPosition: { x: 1, y: 1 } },
        );
      } else {
        handle.element().focus();
        await userEvent.keyboard("{ArrowUp}");
      }
      expect(actions.changePlanAction).toHaveBeenCalledWith({
        questId: QUEST_ID,
        chatId: undefined,
        operations: [{ op: "move", step: 2, before: 1 }],
      });
      await expect
        .element(openSteps().getByRole("listitem").nth(0))
        .toMatchTextContent(SCULPT);
      await expect.element(handle).toHaveFocus();
    },
  );

  test("a failed save keeps the inline draft and Escape cancels it", async () => {
    actions.changePlanAction.mockRejectedValueOnce(new Error("Offline"));
    await render(
      <QuestPlan questId={QUEST_ID} plan={PLAN} actions={PLAN_ACTIONS} />,
    );
    await page.getByRole("button", { name: PLAN_COPY.edit(SCULPT) }).click();
    const input = page.getByRole("textbox", { name: PLAN_COPY.textLabel });
    await expect.element(input).toHaveFocus();
    await input.fill(BRASS);
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PLAN_COPY.failed["not-saved"]);
    await expect.element(input).toHaveValue(BRASS);
    await userEvent.keyboard("{Escape}");
    await expect
      .element(page.getByRole("button", { name: PLAN_COPY.edit(SCULPT) }))
      .toHaveFocus();
    await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
  });

  test("editing a step saves its new text, and an empty one says why", async () => {
    actions.changePlanAction.mockResolvedValue({
      kind: "changed",
      version: MOVED.version,
      lines: [{ kind: "change", text: BRASS, from: SCULPT }],
      state: {
        ...PLAN,
        version: MOVED.version,
        plan: {
          ...PLAN.plan,
          steps: [
            { number: 1, text: BLOCK_OUT, done: false },
            { number: 2, text: BRASS, done: false },
          ],
        },
      },
    });
    await render(
      <QuestPlan questId={QUEST_ID} plan={PLAN} actions={PLAN_ACTIONS} />,
    );

    await userEvent.click(
      page.getByRole("button", { name: PLAN_COPY.edit(SCULPT) }),
    );
    const field = page.getByRole("textbox", { name: PLAN_COPY.textLabel });
    await userEvent.clear(field);
    await userEvent.click(page.getByRole("button", { name: PLAN_COPY.save }));
    await expect.element(page.getByText(PLAN_COPY.needsText)).toBeVisible();
    expect(actions.changePlanAction).not.toHaveBeenCalled();

    await userEvent.fill(field, BRASS);
    await userEvent.click(page.getByRole("button", { name: PLAN_COPY.save }));
    expect(actions.changePlanAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      chatId: undefined,
      operations: [{ op: "change", step: 2, text: BRASS }],
    });
    await expect.element(openSteps()).toMatchTextContent(BRASS);
  });

  test("a change that couldn't be saved is an alert, and a refused one a routine status", async () => {
    actions.changePlanAction.mockRejectedValueOnce(new Error("Offline"));
    await render(
      <QuestPlan questId={QUEST_ID} plan={PLAN} actions={PLAN_ACTIONS} />,
    );
    const moveUp = page.getByRole("menuitem", {
      name: PLAN_COPY.moveUp(SCULPT),
    });

    await page.getByRole("button", { name: PLAN_COPY.actions(SCULPT) }).click();
    await userEvent.click(moveUp);
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PLAN_COPY.failed["not-saved"]);
    await expect.element(page.getByRole("status")).toHaveTextContent("");

    actions.changePlanAction.mockResolvedValueOnce({
      kind: "failed",
      reason: "too-many-steps",
      state: PLAN,
    });
    await page.getByRole("button", { name: PLAN_COPY.actions(SCULPT) }).click();
    await userEvent.click(moveUp);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(PLAN_COPY.failed["too-many-steps"]);
    await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
  });
});
