import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { changeActivityAction } from "@/app/(workspace)/chats/[chatId]/actions.ts";
import { ActivityForm } from "@/app/(workspace)/chats/[chatId]/activity-form.tsx";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { SELECT_ACTIVITY_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture } from "../../../../../support/id-fixtures.ts";
import { activityChoices } from "../../../../activities/activity-choices-test-kit.ts";
import { tabForward } from "../../../../components/keyboard-test-kit.ts";

const actions = vi.hoisted(() => ({
  changeActivityAction: vi.fn<typeof changeActivityAction>(),
}));
vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => actions);
const CHAT_ID = chatIdFixture();
const PHONE_WIDTH = 320;
const PHONE_HEIGHT = 700;
const TARGET_SIZE = 44;
const SAVE_ATTEMPTS = 3;

beforeEach(() => {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("use_case_change_activity", () => {
  test("selection saves immediately, announces progress and prevents overlapping choices", async () => {
    const saving = Promise.withResolvers<void>();
    actions.changeActivityAction.mockReturnValue(saving.promise);
    await render(
      <ActivityForm
        activities={await activityChoices()}
        activityId="open-chat"
        chatId={CHAT_ID}
      />,
    );
    const select = page.getByRole("combobox", {
      name: SELECT_ACTIVITY_COPY.label,
    });
    await expect
      .element(page.getByRole("button", { name: "Change activity" }))
      .not.toBeInTheDocument();
    await select.selectOptions("brainstorming");
    await expect.element(select).toBeDisabled();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(SELECT_ACTIVITY_COPY.changing);
    const [sent] = actions.changeActivityAction.mock.lastCall ?? [];
    expect(sent?.get("chatId")).toBe(CHAT_ID);
    expect(sent?.get("activityId")).toBe("brainstorming");
    saving.resolve();
    await expect.element(select).toBeEnabled();
    await expect.element(select).toHaveValue("brainstorming");
    await select.selectOptions("brainstorming");
    expect(actions.changeActivityAction).toHaveBeenCalledTimes(1);
  });

  test("a failure restores the saved activity and a later selection retries", async () => {
    actions.changeActivityAction
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce(undefined);
    await render(
      <ActivityForm
        activities={await activityChoices()}
        activityId="open-chat"
        chatId={CHAT_ID}
      />,
    );
    const select = page.getByRole("combobox", {
      name: SELECT_ACTIVITY_COPY.label,
    });
    await select.selectOptions("brainstorming");
    await expect.element(select).toBeEnabled();
    await select.selectOptions("project-breakdown");
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(SELECT_ACTIVITY_COPY.failed);
    await expect.element(select).toHaveValue("brainstorming");
    await expect.element(select).toBeEnabled();
    await select.selectOptions("project-breakdown");
    await expect.element(select).toBeEnabled();
    await expect.element(select).toHaveValue("project-breakdown");
    await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
    expect(actions.changeActivityAction).toHaveBeenCalledTimes(SAVE_ATTEMPTS);
  });

  test("the selector is reachable by keyboard at phone width without sideways scrolling", async () => {
    await page.viewport(PHONE_WIDTH, PHONE_HEIGHT);
    await render(
      <ActivityForm
        activities={await activityChoices()}
        activityId="open-chat"
        chatId={CHAT_ID}
      />,
    );
    await tabForward();
    const select = page.getByRole("combobox", {
      name: SELECT_ACTIVITY_COPY.label,
    });
    await expect.element(select).toHaveFocus();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      PHONE_WIDTH,
    );
    expect(
      select.element().getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(TARGET_SIZE);
  });
});
