// The new chat page, the landing page, in Chromium and WebKit: the Today
// section above the new-chat form, or the form alone for a user with nothing
// waiting. What Today reads is today.server.test.ts's.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import NewChatLayout from "@/app/(workspace)/chats/new/layout.tsx";
import NewChatLoading from "@/app/(workspace)/chats/new/loading.tsx";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import type { Today } from "@/today/today.ts";
import { NEW_CHAT_COPY, TODAY_COPY } from "@/ui/copy/chat.ts";
import {
  chatIdFixture,
  projectIdFixture,
} from "../../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { tabForward } from "../../../../components/keyboard-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CHAT, FOX_PROJECT, STANDALONE_CHAT } from "../../page-fixtures.ts";

const NOTHING_WAITING: Today = { projects: [], chats: [] };

const FOX_LATEST_CHAT = chatIdFixture("0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d");
const GARDEN = {
  id: projectIdFixture("7a2d3b9f-4c5e-4f6a-9b0c-1d2e3f4a5b6c"),
  name: "Garden planner",
};

const today = vi.hoisted(() => ({
  readToday: vi.fn<() => Promise<Today>>(),
}));
vi.mock("@/today/today-store.ts", () => today);
vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/projects/store.ts", () => ({
  listProjects: () => Promise.resolve([FOX_PROJECT]),
}));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: () => Promise.resolve([]),
}));
vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../../../../activities/activity-choices-test-kit.ts"),
);

const NO_PARAMS = Promise.resolve({});

async function renderLanding(): Promise<void> {
  const content = await NewChatPage({
    params: NO_PARAMS,
    searchParams: Promise.resolve({}),
  });
  await render(
    inWorkspace(<NewChatLayout params={NO_PARAMS}>{content}</NewChatLayout>),
  );
}

function continueLink(projectName: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("link", {
    name: TODAY_COPY.continueLabel(projectName),
  });
}

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_today_on_landing", () => {
  beforeEach(() => {
    today.readToday.mockResolvedValue({
      projects: [
        {
          project: { id: FOX_PROJECT.id, name: FOX_PROJECT.name },
          nextStep: "retopo the flipper",
          latestChat: FOX_LATEST_CHAT,
        },
        {
          project: GARDEN,
          nextStep: undefined,
          latestChat: FOX_CHAT.id,
        },
      ],
      chats: [STANDALONE_CHAT],
    });
  });

  test("shows each project's next step and a Continue link to its latest chat, above the form", async () => {
    await renderLanding();

    await expect
      .element(
        page.getByRole("heading", { level: 1, name: TODAY_COPY.heading }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: FOX_PROJECT.name, exact: true }))
      .toHaveAttribute("href", `/projects/${FOX_PROJECT.id}`);
    await expect
      .element(page.getByText(`${TODAY_COPY.nextStepLabel} retopo the flipper`))
      .toBeVisible();
    await expect
      .element(continueLink(FOX_PROJECT.name))
      .toHaveAttribute("href", `/chats/${FOX_LATEST_CHAT}`);
    await expect
      .element(continueLink(GARDEN.name))
      .toHaveAttribute("href", `/chats/${FOX_CHAT.id}`);
    // Only the fox project records a next step.
    expect(page.getByText(TODAY_COPY.nextStepLabel).all()).toHaveLength(1);
    await expect
      .element(
        page.getByRole("heading", { level: 2, name: NEW_CHAT_COPY.heading }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: NEW_CHAT_COPY.start }))
      .toBeVisible();
  });

  test("lists recent chats, each linking to its conversation", async () => {
    await renderLanding();

    await expect
      .element(page.getByRole("heading", { name: TODAY_COPY.chatsHeading }))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: STANDALONE_CHAT.buddy.name }))
      .toHaveAttribute("href", `/chats/${STANDALONE_CHAT.id}`);
  });

  test("the keyboard reaches a project's link, then its Continue link, then the next project", async () => {
    await renderLanding();

    page
      .getByRole("link", { name: FOX_PROJECT.name, exact: true })
      .element()
      .focus();
    await tabForward();
    await expect.element(continueLink(FOX_PROJECT.name)).toHaveFocus();
    await tabForward();
    await expect
      .element(page.getByRole("link", { name: GARDEN.name, exact: true }))
      .toHaveFocus();
  });

  test("a new user with nothing waiting sees only the new-chat form", async () => {
    today.readToday.mockResolvedValue(NOTHING_WAITING);
    await renderLanding();

    await expect
      .element(
        page.getByRole("heading", { level: 1, name: NEW_CHAT_COPY.heading }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: NEW_CHAT_COPY.start }))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: TODAY_COPY.heading }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("heading", { name: TODAY_COPY.projectsHeading }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("heading", { name: TODAY_COPY.chatsHeading }))
      .not.toBeInTheDocument();
  });
});

describe("the landing page while it loads", () => {
  test("shows the form's heading and says it is loading", async () => {
    await render(
      inWorkspace(
        <NewChatLayout params={NO_PARAMS}>
          <NewChatLoading />
        </NewChatLayout>,
      ),
    );

    await expect
      .element(
        page.getByRole("heading", { level: 1, name: NEW_CHAT_COPY.heading }),
      )
      .toBeVisible();
    await expect
      .element(page.getByText(NEW_CHAT_COPY.loading))
      .toBeInTheDocument();
  });
});
