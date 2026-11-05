// The Chats page's "New chat" dialog in Chromium and WebKit.
// "use_case_standalone_chat" in use-cases/chats.md: the page shows a "New
// chat" button rather than the form; the button opens a modal dialog,
// named "New chat", that takes focus and keeps it, holds the new-chat form
// with the open chat, no project and Vellum chosen, and closes with Escape
// or its close button, giving focus back to the button. Opening and closing
// it sends nothing.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import type { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { getConstruct } from "@/constructs/index.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";
import { activityChoices } from "../activities/activity-choices-test-kit.ts";
import { tabForward } from "./keyboard-test-kit.ts";

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);

const VELLUM = getConstruct("vellum");
const PROJECT = {
  id: projectIdFixture(),
  name: "Low-poly fox",
  status: "active" as const,
};

async function renderDialog(): Promise<void> {
  await render(
    <NewChatDialog
      activities={await activityChoices()}
      projects={[PROJECT]}
      selectedActivityId={DEFAULT_ACTIVITY_ID}
      userConstructs={[]}
    />,
  );
}

function newChatButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: NEW_CHAT_COPY.dialogHeading });
}

function dialog(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", { name: NEW_CHAT_COPY.dialogHeading });
}

// Whether the focused element is inside the open dialog.
function focusInDialog(): boolean {
  return dialog().element().contains(document.activeElement);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_standalone_chat", () => {
  test("the page shows a New chat button, not the form", async () => {
    await renderDialog();

    await expect.element(newChatButton()).toBeVisible();
    await expect
      .element(newChatButton())
      .toHaveAttribute("aria-haspopup", "dialog");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: NEW_CHAT_COPY.start }))
      .not.toBeInTheDocument();
  });

  test("the button opens a named dialog with the form and its default choices", async () => {
    await renderDialog();

    await newChatButton().click();

    await expect.element(dialog()).toBeVisible();
    expect(focusInDialog()).toBe(true);
    await expect
      .element(
        page.getByRole("combobox", { name: NEW_CHAT_COPY.activityLabel }),
      )
      .toHaveDisplayValue(getActivity(DEFAULT_ACTIVITY_ID).name);
    await expect
      .element(page.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel }))
      .toHaveDisplayValue(NEW_CHAT_COPY.noProject);
    await expect
      .element(page.getByRole("option", { name: `${PROJECT.name} (Active)` }))
      .toBeInTheDocument();
    await expect.element(page.getByText(VELLUM.description)).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: NEW_CHAT_COPY.start }))
      .toBeVisible();
  });

  test("the keyboard stays in the dialog", async () => {
    await renderDialog();
    await newChatButton().click();
    await expect.element(dialog()).toBeVisible();

    page.getByRole("button", { name: NEW_CHAT_COPY.start }).element().focus();
    await tabForward();

    // Chromium wraps round to the first control; WebKit's Option+Tab keeps
    // focus where it was. Either way it stays in the dialog.
    expect(focusInDialog()).toBe(true);
  });

  test("Escape closes the dialog and gives focus back to the button", async () => {
    await renderDialog();
    await newChatButton().click();
    await expect.element(dialog()).toBeVisible();

    await userEvent.keyboard("{Escape}");

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(newChatButton()).toHaveFocus();
    expect(actions.startChatAction).not.toHaveBeenCalled();
  });

  test("the close button closes the dialog and gives focus back to the button", async () => {
    await renderDialog();
    await newChatButton().click();

    await page.getByRole("button", { name: NEW_CHAT_COPY.closeDialog }).click();

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(newChatButton()).toHaveFocus();
    expect(actions.startChatAction).not.toHaveBeenCalled();
  });
});
