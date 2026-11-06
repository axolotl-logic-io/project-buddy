// Starting a new project from the new-chat form, in Chromium and WebKit,
// inside the Chats page's New chat dialog. "use_case_new_project_from_new_chat"
// in use-cases/projects.md: the project interview and a new project choose
// each other, leaving one leaves the other, and Start chat asks for the
// project's name in a dialog of its own before anything is sent. Cancel
// returns to the form as it was.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import type { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { NEW_PROJECT } from "@/chats/new-chat-selection.ts";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";
import { activityChoices } from "../activities/activity-choices-test-kit.ts";

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);

const PROJECT = {
  id: projectIdFixture(),
  name: "Low-poly fox",
  status: "active" as const,
};

// Renders the Chats page's dialog and opens it.
async function openForm(): Promise<void> {
  await render(
    <NewChatDialog
      activities={await activityChoices()}
      projects={[PROJECT]}
      selectedActivityId={DEFAULT_ACTIVITY_ID}
      userConstructs={[]}
    />,
  );
  await page.getByRole("button", { name: NEW_CHAT_COPY.dialogHeading }).click();
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
  test("choosing activities preserves a new quest", async () => {
    await openForm();
    await projectField().selectOptions(NEW_CHAT_COPY.newProject);
    await activityField().selectOptions(getActivity("brainstorming").name);
    await expect.element(projectField()).toHaveValue(NEW_PROJECT);
    await activityField().selectOptions(getActivity("project-breakdown").name);
    await expect.element(projectField()).toHaveValue(NEW_PROJECT);
    await projectField().selectOptions(`${PROJECT.name} (Active)`);
    await expect.element(activityField()).toHaveValue("project-breakdown");
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
      .element(page.getByRole("dialog", { name: NEW_CHAT_COPY.dialogHeading }))
      .toBeVisible();
    await expect.element(projectField()).toHaveValue(NEW_PROJECT);
    await expect.element(activityField()).toHaveValue(DEFAULT_ACTIVITY_ID);
    expect(actions.startChatAction).not.toHaveBeenCalled();
  });

  test("Start project sends the name with the new project, the activity and the construct", async () => {
    const { promise, resolve } = Promise.withResolvers<{ kind: "idle" }>();
    actions.startChatAction.mockReturnValue(promise);
    await openForm();
    await projectField().selectOptions(NEW_CHAT_COPY.newProject);
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.nextConstruct })
      .click();
    await expect
      .element(page.getByRole("button", { name: NEW_CHAT_COPY.nextConstruct }))
      .toBeVisible();
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
    expect(sent?.get("activityId")).toBe(DEFAULT_ACTIVITY_ID);
    expect(sent?.get("constructId")).toBe("lumen");
    resolve({ kind: "idle" });
  });

  test("a refused name is explained in the name dialog, which stays open", async () => {
    actions.startChatAction.mockResolvedValue({
      kind: "invalidProjectName",
      message: NEW_CHAT_COPY.needsProjectName,
      projectId: NEW_PROJECT,
      activityId: DEFAULT_ACTIVITY_ID,
      constructId: "vellum",
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

describe("use_case_new_project_name_too_long", () => {
  test("the name field takes no more than the limit", async () => {
    await openForm();
    await projectField().selectOptions(NEW_CHAT_COPY.newProject);
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await userEvent.type(nameField(), "f".repeat(PROJECT_NAME_MAX_LENGTH + 1));

    await expect
      .element(nameField())
      .toHaveValue("f".repeat(PROJECT_NAME_MAX_LENGTH));
  });

  test("a name refused as too long is explained at the name field, which keeps it", async () => {
    const name = "f".repeat(PROJECT_NAME_MAX_LENGTH + 1);
    const tooLong = NEW_CHAT_COPY.projectNameTooLong(PROJECT_NAME_MAX_LENGTH);
    actions.startChatAction.mockResolvedValue({
      kind: "invalidProjectName",
      message: tooLong,
      projectId: NEW_PROJECT,
      activityId: DEFAULT_ACTIVITY_ID,
      constructId: "vellum",
      name,
    });
    await openForm();
    await projectField().selectOptions(NEW_CHAT_COPY.newProject);
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await userEvent.type(nameField(), "Garden shed");
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.startProject })
      .click();

    await expect.element(nameField()).toHaveAccessibleDescription(tooLong);
    await expect.element(nameField()).toHaveAttribute("aria-invalid", "true");
    await expect.element(nameField()).toHaveValue(name);
  });
});

test("finished quests stay selectable with explicit status labels", async () => {
  await render(
    <NewChatDialog
      activities={await activityChoices()}
      projects={[
        { ...PROJECT, status: "completed" },
        {
          ...PROJECT,
          id: projectIdFixture(),
          name: "Garden",
          status: "abandoned",
        },
      ]}
      selectedActivityId={DEFAULT_ACTIVITY_ID}
      userConstructs={[]}
    />,
  );
  await page.getByRole("button", { name: NEW_CHAT_COPY.dialogHeading }).click();
  await projectField().selectOptions("Low-poly fox (Completed)");
  await expect.element(projectField()).toHaveValue(PROJECT.id);
  await projectField().selectOptions("Garden (Abandoned)");
  await expect.element(projectField()).not.toHaveValue(PROJECT.id);
});

test("fixed activity and construct are named before starting an adventure", async () => {
  await render(
    <NewChatDialog
      activities={await activityChoices()}
      projects={[]}
      selectedActivityId="brainstorming"
      fixedActivity={true}
      fixedConstructId="lumen"
      userConstructs={[]}
    />,
  );
  await page.getByRole("button", { name: NEW_CHAT_COPY.dialogHeading }).click();
  const dialog = page.getByRole("dialog");
  await expect
    .element(dialog.getByText("Activity: Brainstorming", { exact: true }))
    .toBeVisible();
  await expect
    .element(dialog.getByText("Construct: Lumen", { exact: true }))
    .toBeVisible();
  expect(actions.startChatAction).not.toHaveBeenCalled();
});
