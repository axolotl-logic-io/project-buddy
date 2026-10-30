// A project's page in Chromium and WebKit: the new-chat form on it, with
// the project chosen. "use_case_new_chat": the form sends the project and
// shows that the chat is starting. "use_case_start_without_claude" and the
// used-up quota: the form stays on the project's page, says why, and keeps
// the choices, beside the project's chats; and "use_case_over_quota". What the action saves is
// chats/actions.server.test.ts's.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DEFAULT_ACTIVITY_ID, getActivity } from "@/activities/index.ts";
import type {
  StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { getBuddy } from "@/buddies/index.ts";
import {
  NEW_CHAT_COPY,
  OPENING_COPY,
  quotaUsedUpMessage,
} from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { projectIdFixture } from "../../../../id-fixtures.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CHAT, FOX_PROJECT } from "../../page-fixtures.ts";

const OTHER_PROJECT = {
  id: projectIdFixture("1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e"),
  name: "Donut",
  createdAt: new Date("2026-10-10T12:00:00Z"),
};

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/projects/store.ts", () => ({
  getProject: () => Promise.resolve(FOX_PROJECT),
  listProjects: () => Promise.resolve([FOX_PROJECT, OTHER_PROJECT]),
}));
vi.mock("@/chats/store.ts", () => ({
  listChats: () => Promise.resolve([FOX_CHAT]),
}));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: () => Promise.resolve([]),
}));
vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../../../../activities/activity-choices-test-kit.ts"),
);
vi.mock(
  "@/activities/activity-sessions.ts",
  () => import("../../../../activities/activity-sessions-test-kit.ts"),
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

function projectField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel });
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
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_new_chat", () => {
  test("the project's page starts a chat in the project, and shows it is starting", async () => {
    const { promise, resolve } = Promise.withResolvers<StartChatState>();
    actions.startChatAction.mockReturnValue(promise);
    await renderProject();

    await expect.element(projectField()).toHaveValue(FOX_PROJECT.id);
    await expect
      .element(
        page.getByRole("combobox", { name: NEW_CHAT_COPY.activityLabel }),
      )
      .toHaveDisplayValue(getActivity(DEFAULT_ACTIVITY_ID).name);
    await expect
      .element(page.getByText(getBuddy("hippy").description))
      .toBeVisible();
    await expect.element(chatLink()).toBeVisible();
    await startButton().click();

    await expect.element(startButton()).toBeDisabled();
    await expect.element(page.getByText(NEW_CHAT_COPY.starting)).toBeVisible();
    const [, sent] = actions.startChatAction.mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
    expect(sent?.get("activityId")).toBe(DEFAULT_ACTIVITY_ID);
    expect(sent?.get("buddyId")).toBe("hippy");
    resolve({ kind: "idle" });
    await expect.element(startButton()).toBeEnabled();
  });
});

describe("use_case_start_without_claude", () => {
  test("the form stays on the project's page, says Claude is unavailable, and keeps the choices", async () => {
    actions.startChatAction.mockResolvedValue({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: OTHER_PROJECT.id,
      activityId: "brainstorming",
      buddyId: "mr-tee",
    });
    await renderProject();

    await projectField().selectOptions(OTHER_PROJECT.name);
    await startButton().click();

    await expect
      .element(page.getByText(OPENING_COPY.claudeUnavailable))
      .toBeVisible();
    await expect.element(projectField()).toHaveValue(OTHER_PROJECT.id);
    await expect
      .element(
        page.getByRole("combobox", { name: NEW_CHAT_COPY.activityLabel }),
      )
      .toHaveValue("brainstorming");
    await expect
      .element(page.getByText(getBuddy("mr-tee").description))
      .toBeVisible();
    await expect.element(startButton()).toBeEnabled();
    await expect.element(chatLink()).toBeVisible();
  });
});

describe("use_case_over_quota", () => {
  test("the form says the quota is used up and when it resets, on the project's page beside its chats", async () => {
    const message = quotaUsedUpMessage(new Date("2026-11-01T00:00:00Z"));
    actions.startChatAction.mockResolvedValue({ kind: "quotaUsedUp", message });
    await renderProject();

    await startButton().click();

    await expect.element(page.getByText(message)).toBeVisible();
    await expect.element(projectField()).toHaveValue(FOX_PROJECT.id);
    await expect.element(chatLink()).toBeVisible();
  });
});
