// Starting a new project from the new-chat form, in Chromium and WebKit,
// inside the Chats page's New chat dialog. "use_case_new_project_from_new_chat"
// in use-cases/projects.md: the project interview and a new project choose
// each other, leaving one leaves the other, and Start chat asks for the
// project's name in a dialog of its own before anything is sent. Cancel
// returns to the form as it was.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import type { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { NEW_PROJECT } from "@/chats/new-chat-selection.ts";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { NEW_CHAT_COPY, STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";
import { activityChoices } from "../activities/activity-choices-test-kit.ts";

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);

const INTERVIEW = getActivity(INTERVIEW_ACTIVITY_ID);
const PROJECT = { id: projectIdFixture(), name: "Low-poly fox" };

// Renders the Chats page's dialog and opens it.
async function openForm(): Promise<void> {
  await render(
    <NewChatDialog
      activities={await activityChoices()}
      projects={[PROJECT]}
      selectedActivityId={DEFAULT_ACTIVITY_ID}
      userBuddies={[]}
    />,
  );
  await page
    .getByRole("button", { name: STANDALONE_CHATS_COPY.newHeading })
    .click();
}

function activityField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: NEW_CHAT_COPY.activityLabel });
}

function projectField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel });
}

function namePrompt(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", { name: NEW_CHAT_COPY.projectNameHeading });
}

function nameField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: NEW_CHAT_COPY.projectNameLabel });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_new_project_from_new_chat", () => {
  test("choosing the project interview chooses a new project, and another activity leaves it", async () => {
    await openForm();

    await activityField().selectOptions(INTERVIEW.name);
    await expect.element(projectField()).toHaveValue(NEW_PROJECT);

    await activityField().selectOptions(getActivity("brainstorming").name);
    await expect.element(projectField()).toHaveValue("");
  });

  test("choosing a new project chooses the interview, and an existing project leaves it", async () => {
    await openForm();

    await projectField().selectOptions(NEW_CHAT_COPY.newProject);
    await expect.element(activityField()).toHaveValue(INTERVIEW_ACTIVITY_ID);

    await projectField().selectOptions(PROJECT.name);
    await expect.element(activityField()).toHaveValue(DEFAULT_ACTIVITY_ID);
  });

  test("Start chat asks for the name first, and Cancel goes back to the form as it was", async () => {
    await openForm();
    await projectField().selectOptions(NEW_CHAT_COPY.newProject);

    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await expect.element(namePrompt()).toBeVisible();
    await expect.element(nameField()).toHaveFocus();
    expect(actions.startChatAction).not.toHaveBeenCalled();

    await page
      .getByRole("button", { name: NEW_CHAT_COPY.cancelProjectName })
      .click();

    await expect.element(namePrompt()).not.toBeInTheDocument();
    await expect
      .element(
        page.getByRole("dialog", { name: STANDALONE_CHATS_COPY.newHeading }),
      )
      .toBeVisible();
    await expect.element(projectField()).toHaveValue(NEW_PROJECT);
    await expect.element(activityField()).toHaveValue(INTERVIEW_ACTIVITY_ID);
    expect(actions.startChatAction).not.toHaveBeenCalled();
  });

  test("Start project sends the name with the new project, the interview and the buddy", async () => {
    const { promise, resolve } = Promise.withResolvers<{ kind: "idle" }>();
    actions.startChatAction.mockReturnValue(promise);
    await openForm();
    await activityField().selectOptions(INTERVIEW.name);
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await userEvent.type(nameField(), "Garden shed");
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.startProject })
      .click();

    await expect
      .element(namePrompt().getByText(NEW_CHAT_COPY.starting))
      .toBeVisible();
    const [, sent] = actions.startChatAction.mock.lastCall ?? [];
    expect(sent?.get("name")).toBe("Garden shed");
    expect(sent?.get("projectId")).toBe(NEW_PROJECT);
    expect(sent?.get("activityId")).toBe(INTERVIEW_ACTIVITY_ID);
    expect(sent?.get("buddyId")).toBe("hippy");
    resolve({ kind: "idle" });
  });

  test("a refused name is explained in the name dialog, which stays open", async () => {
    actions.startChatAction.mockResolvedValue({
      kind: "needsProjectName",
      message: NEW_CHAT_COPY.needsProjectName,
      projectId: NEW_PROJECT,
      activityId: INTERVIEW_ACTIVITY_ID,
      buddyId: "hippy",
      name: " ",
    });
    await openForm();
    await projectField().selectOptions(NEW_CHAT_COPY.newProject);
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await userEvent.type(nameField(), " ");
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.startProject })
      .click();

    await expect
      .element(namePrompt().getByText(NEW_CHAT_COPY.needsProjectName))
      .toBeVisible();
    await expect.element(nameField()).toHaveAttribute("aria-invalid", "true");
  });
});
