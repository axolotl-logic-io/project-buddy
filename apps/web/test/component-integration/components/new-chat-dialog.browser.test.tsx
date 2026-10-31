// The Chats page's "New chat" dialog in Chromium and WebKit.
// "use_case_standalone_chat" in use-cases/chats.md: the page shows a "New
// chat" button rather than the form; the button opens a modal dialog,
// named "New chat", that takes focus and keeps it, holds the new-chat form
// with the open chat, no project and Hippy chosen, and closes with Escape
// or its close button, giving focus back to the button. Escape in the
// buddy list closes only the list. Opening and closing it sends nothing.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import type { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { getBuddy } from "@/buddies/index.ts";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { NEW_CHAT_COPY, STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";
import { activityChoices } from "../activities/activity-choices-test-kit.ts";
import { tabForward } from "./keyboard-test-kit.ts";

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);

const HIPPY = getBuddy("hippy");
const PROJECT = { id: projectIdFixture(), name: "Low-poly fox" };

async function renderDialog(): Promise<void> {
  await render(
    <NewChatDialog
      activities={await activityChoices()}
      projects={[PROJECT]}
      selectedActivityId={DEFAULT_ACTIVITY_ID}
      userBuddies={[]}
    />,
  );
}

function newChatButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: STANDALONE_CHATS_COPY.newHeading });
}

function dialog(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", { name: STANDALONE_CHATS_COPY.newHeading });
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
      .element(page.getByRole("option", { name: PROJECT.name }))
      .toBeInTheDocument();
    await expect.element(page.getByText(HIPPY.description)).toBeVisible();
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

    await page
      .getByRole("button", { name: STANDALONE_CHATS_COPY.closeNewChat })
      .click();

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(newChatButton()).toHaveFocus();
    expect(actions.startChatAction).not.toHaveBeenCalled();
  });

  test("Escape in the buddy list closes the list, not the dialog", async () => {
    await renderDialog();
    await newChatButton().click();
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.chooseBuddyButton })
      .click();
    await expect
      .element(page.getByRole("button", { name: HIPPY.name }))
      .toHaveFocus();

    await userEvent.keyboard("{Escape}");

    await expect
      .element(page.getByRole("list", { name: NEW_CHAT_COPY.builtInBuddies }))
      .not.toBeInTheDocument();
    // A closing dialog stays in the page while it animates out, so its
    // state, not its visibility, shows that it stayed open.
    await expect.element(dialog()).toHaveAttribute("data-state", "open");
    await expect
      .element(
        page.getByRole("button", { name: NEW_CHAT_COPY.chooseBuddyButton }),
      )
      .toBeInTheDocument();
  });
});
