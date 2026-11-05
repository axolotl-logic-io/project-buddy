// A project's page in Chromium and WebKit: its New chat button and the
// dialog it opens. "use_case_new_chat": the page opens with the form
// closed; the dialog has no project field, sends the project in any
// activity and shows that the chat is starting; Escape or the close button
// closes it, starting nothing, and gives focus back to the button.
// "use_case_start_without_claude" and "use_case_out_of_gold": the dialog
// stays open, says why, and keeps the choices. What the action saves is
// chats/actions.server.test.ts's.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import type {
  StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { getBuddy } from "@/buddies/index.ts";
import type { checkInsAreOn } from "@/check-ins/check-ins-enabled.ts";
import { userMessage } from "@/errors/app-error.ts";
import type { ProjectMember } from "@/projects/members-store.ts";
import type { getProject } from "@/projects/store.ts";
import { NEW_CHAT_COPY, OPENING_COPY } from "@/ui/copy/chat.ts";
import { CHECK_IN_SETTING_COPY } from "@/ui/copy/check-ins.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import {
  FOX_CHAT,
  FOX_PROJECT,
  FOX_PROJECT_AS_MEMBER,
} from "../../page-fixtures.ts";

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
const stores = vi.hoisted(() => ({
  getProject: vi.fn<typeof getProject>(),
  checkInsAreOn: vi.fn<typeof checkInsAreOn>(() => false),
}));
vi.mock("@/projects/store.ts", () => ({
  getProject: stores.getProject,
}));
vi.mock("@/check-ins/check-ins-enabled.ts", () => ({
  checkInsAreOn: stores.checkInsAreOn,
}));
vi.mock("@/chats/store.ts", () => ({
  listChats: () => Promise.resolve([FOX_CHAT]),
}));
vi.mock("@/milestones/milestone-store.ts", () => ({
  listMilestones: () => Promise.resolve([]),
}));
vi.mock("@/check-ins/check-in-store.ts", () => ({
  readCheckInFrequency: (): Promise<"off"> => Promise.resolve("off"),
}));
vi.mock(
  "@/projects/project-invitations.ts",
  () => import("../../../../projects/project-invitations-test-kit.ts"),
);
vi.mock("@/app/(workspace)/projects/invitations/actions.ts", () => ({
  joinProjectAction: vi.fn(),
  declineProjectInvitationAction: vi.fn(),
}));
vi.mock("@/projects/members-store.ts", () => ({
  listProjectMembers: async (): Promise<ProjectMember[]> => {
    const { FOX_OWNER } = await import("../../page-fixtures.ts");
    return [FOX_OWNER];
  },
}));
vi.mock("@/notes/note-store.ts", () => ({
  readRecentNotes: () => Promise.resolve([]),
}));
vi.mock("@/app/(workspace)/projects/[projectId]/(overview)/actions.ts", () => ({
  inviteToProjectAction: vi.fn(),
  revokeProjectInvitationAction: vi.fn(),
  saveCheckInSettingAction: vi.fn(),
  deleteNoteAction: vi.fn(),
  editMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
  removeMemberAction: vi.fn(),
  leaveProjectAction: vi.fn(),
}));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: () => Promise.resolve([]),
}));
vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../../../../activities/activity-choices-test-kit.ts"),
);

const PARAMS = Promise.resolve({ projectId: FOX_PROJECT.id });

async function renderProject(): Promise<void> {
  const content = await ProjectPage({
    params: PARAMS,
    searchParams: Promise.resolve({}),
  });
  await render(
    inWorkspace(<ProjectLayout params={PARAMS}>{content}</ProjectLayout>),
  );
}

function newChatButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: NEW_CHAT_COPY.dialogHeading });
}

function dialog(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", { name: NEW_CHAT_COPY.dialogHeading });
}

function activityField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: NEW_CHAT_COPY.activityLabel });
}

// The project's page with its New chat dialog open.
async function openDialog(): Promise<void> {
  await renderProject();
  await newChatButton().click();
}

function startButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: NEW_CHAT_COPY.start });
}

// The link to the project's chat, listed under the form.
function chatLink(): ReturnType<typeof page.getByRole> {
  return page.getByRole("link", { name: FOX_CHAT.buddy.name });
}

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  stores.getProject.mockResolvedValue(FOX_PROJECT);
  stores.checkInsAreOn.mockReturnValue(false);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_new_chat", () => {
  test("the page shows the New chat button with the form closed", async () => {
    await renderProject();

    await expect.element(newChatButton()).toBeVisible();
    await expect.element(chatLink()).toBeVisible();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(startButton()).not.toBeInTheDocument();
  });

  test("the dialog has no project field, and starts a chat in the project, showing it is starting", async () => {
    const { promise, resolve } = Promise.withResolvers<StartChatState>();
    actions.startChatAction.mockReturnValue(promise);
    await openDialog();

    await expect.element(dialog()).toBeVisible();
    expect(dialog().element().contains(document.activeElement)).toBe(true);
    await expect
      .element(activityField())
      .toHaveDisplayValue(getActivity(DEFAULT_ACTIVITY_ID).name);
    await expect
      .element(page.getByText(getBuddy("vellum").description))
      .toBeVisible();
    await expect
      .element(page.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel }))
      .not.toBeInTheDocument();
    await startButton().click();

    await expect.element(startButton()).toBeDisabled();
    await expect.element(page.getByText(NEW_CHAT_COPY.starting)).toBeVisible();
    const [, sent] = actions.startChatAction.mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
    expect(sent?.get("activityId")).toBe(DEFAULT_ACTIVITY_ID);
    expect(sent?.get("buddyId")).toBe("vellum");
    resolve({ kind: "idle" });
    await expect.element(startButton()).toBeEnabled();
  });

  test("the project interview starts in the project, with no new project to name", async () => {
    const { promise, resolve } = Promise.withResolvers<StartChatState>();
    actions.startChatAction.mockReturnValue(promise);
    await openDialog();

    await activityField().selectOptions(
      getActivity(INTERVIEW_ACTIVITY_ID).name,
    );
    await startButton().click();

    await expect.element(page.getByText(NEW_CHAT_COPY.starting)).toBeVisible();
    await expect
      .element(
        page.getByRole("dialog", { name: NEW_CHAT_COPY.projectNameHeading }),
      )
      .not.toBeInTheDocument();
    const [, sent] = actions.startChatAction.mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
    expect(sent?.get("activityId")).toBe(INTERVIEW_ACTIVITY_ID);
    resolve({ kind: "idle" });
    await expect.element(startButton()).toBeEnabled();
  });

  test("Escape closes the dialog, starting nothing, and gives focus back to New chat", async () => {
    await openDialog();
    await expect.element(dialog()).toBeVisible();

    await userEvent.keyboard("{Escape}");

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(newChatButton()).toHaveFocus();
    await expect.element(chatLink()).toBeVisible();
    expect(actions.startChatAction).not.toHaveBeenCalled();
  });

  test("the close button closes the dialog, starting nothing, and gives focus back to New chat", async () => {
    await openDialog();

    await page.getByRole("button", { name: NEW_CHAT_COPY.closeDialog }).click();

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(newChatButton()).toHaveFocus();
    expect(actions.startChatAction).not.toHaveBeenCalled();
  });
});

describe("use_case_start_without_claude", () => {
  test("the dialog stays open, says Claude is unavailable, and keeps the choices", async () => {
    actions.startChatAction.mockResolvedValue({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: FOX_PROJECT.id,
      activityId: "brainstorming",
      buddyId: "lumen",
      name: "",
    });
    await openDialog();

    await activityField().selectOptions(getActivity("brainstorming").name);
    await startButton().click();

    await expect
      .element(dialog().getByText(OPENING_COPY.claudeUnavailable))
      .toBeVisible();
    await expect.element(activityField()).toHaveValue("brainstorming");
    await expect
      .element(page.getByText(getBuddy("lumen").description))
      .toBeVisible();
    await expect.element(startButton()).toBeEnabled();
  });
});

describe("use_case_out_of_gold", () => {
  test("the dialog says she is out of gold, and stays open", async () => {
    const message = userMessage("out-of-gold");
    actions.startChatAction.mockResolvedValue({ kind: "outOfGold", message });
    await openDialog();

    await startButton().click();

    await expect.element(dialog().getByText(message)).toBeVisible();
    await expect.element(startButton()).toBeEnabled();
  });
});

// The check-ins section, by its heading.
function checkInSetting(): ReturnType<typeof page.getByRole> {
  return page.getByRole("region", { name: CHECK_IN_SETTING_COPY.heading });
}

describe("use_case_set_check_ins", () => {
  test("with check-ins on, the owner's project page has the check-in setting", async () => {
    stores.checkInsAreOn.mockReturnValue(true);
    await renderProject();

    await expect.element(checkInSetting()).toBeVisible();
  });

  test("with check-ins on, a member's view of the project has no check-in setting", async () => {
    stores.checkInsAreOn.mockReturnValue(true);
    stores.getProject.mockResolvedValue(FOX_PROJECT_AS_MEMBER);
    await renderProject();

    await expect.element(chatLink()).toBeVisible();
    await expect.element(checkInSetting()).not.toBeInTheDocument();
  });
});
