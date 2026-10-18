import { render, screen, within } from "@testing-library/react";
import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import StandaloneChatsLayout from "@/app/(workspace)/chat/layout.tsx";
import StandaloneChatsLoading from "@/app/(workspace)/chat/loading.tsx";
import StandaloneChatsPage from "@/app/(workspace)/chat/page.tsx";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import type { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import type { listAllChats } from "@/chats/all-chats.ts";
import type { listCentralChats } from "@/chats/central-chat.ts";
import type { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY, STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { projectIdFixture, userBuddyIdFixture } from "../../../id-fixtures.ts";
import {
  CENTRAL_CHAT,
  DONUT_PROJECT,
  FOX_CHAT,
  FOX_PROJECT,
} from "../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
const stores = vi.hoisted(() => ({
  listAllChats: vi.fn<typeof listAllChats>(),
  listCentralChats: vi.fn<typeof listCentralChats>(),
  listProjects: vi.fn<typeof listProjects>(),
  ownBuddyChoices: vi.fn<typeof ownBuddyChoices>(),
}));
vi.mock("@/chats/all-chats.ts", () => ({
  listAllChats: stores.listAllChats,
}));
vi.mock("@/chats/central-chat.ts", () => ({
  listCentralChats: stores.listCentralChats,
}));
vi.mock("@/projects/store.ts", () => ({
  listProjects: stores.listProjects,
}));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: stores.ownBuddyChoices,
}));
vi.mock("@/app/(workspace)/chat/actions.ts", () => ({
  startStandaloneChatAction: vi.fn(),
}));

// What the chats page is called with: no route parameters, and its search
// parameters, of which it reads `project` (issue #472).
interface ChatsPageArgs {
  readonly params: Promise<Record<string, never>>;
  readonly searchParams: Promise<{ project?: string }>;
}

const chatsPage: (args: ChatsPageArgs) => Promise<JSX.Element> =
  StandaloneChatsPage;

const OWN_BUDDY: OwnBuddyChoice = {
  id: userBuddyIdFixture(),
  name: "My buddy",
};

// The labels of the chats page's project selector (issue #472), which
// src/ui/copy/chat.ts holds.
const PROJECT_FILTER_LABEL = "Project";
const ALL_PROJECTS = "All";
const SHOW_CHATS = "Show chats";

// The chats page, at /chat or at /chat?project=<project>.
function chatsPageAt(project?: string): Promise<JSX.Element> {
  let searchParams: Promise<{ project?: string }> = Promise.resolve({});
  if (project !== undefined) {
    searchParams = Promise.resolve({ project });
  }
  return chatsPage({ params: Promise.resolve({}), searchParams });
}

// The project selector above the list of chats.
function projectSelector(): HTMLElement {
  return screen.getByRole("combobox", { name: PROJECT_FILTER_LABEL });
}

// The card in the list of chats that links to the chat.
function chatCard(chatId: string): HTMLElement {
  const link = screen
    .getAllByRole("link")
    .find((candidate) => candidate.getAttribute("href") === `/chats/${chatId}`);
  const card = link?.closest("li");
  if (card === null || card === undefined) {
    throw new Error(`No card links to /chats/${chatId}`);
  }
  return card;
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  stores.listAllChats.mockResolvedValue([FOX_CHAT, CENTRAL_CHAT]);
  stores.listCentralChats.mockResolvedValue([CENTRAL_CHAT]);
  stores.listProjects.mockResolvedValue([DONUT_PROJECT, FOX_PROJECT]);
  stores.ownBuddyChoices.mockResolvedValue([OWN_BUDDY]);
});

describe("standalone chat hub", () => {
  test("offers a buddy picker and previous chats in a projects-style page", async () => {
    render(
      <StandaloneChatsLayout params={Promise.resolve({})}>
        {await chatsPageAt()}
      </StandaloneChatsLayout>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: STANDALONE_CHATS_COPY.heading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: STANDALONE_CHATS_COPY.listHeading,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(chatCard(CENTRAL_CHAT.id)).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: OWN_BUDDY.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: NEW_CHAT_COPY.start }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("offers a new chat without requiring a project", async () => {
    stores.listAllChats.mockResolvedValue([]);
    stores.listCentralChats.mockResolvedValue([]);
    stores.listProjects.mockResolvedValue([]);
    render(await chatsPageAt());
    expect(screen.getByText(STANDALONE_CHATS_COPY.noChats)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: NEW_CHAT_COPY.start }),
    ).toBeEnabled();
  });

  test("shows a loading skeleton while chat data loads", () => {
    render(<StandaloneChatsLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      STANDALONE_CHATS_COPY.loading,
    );
  });
});

// Issue #471: the site calls its chats list "Chats".
describe("the chats list's heading", () => {
  test("heads the list of previous chats Chats", async () => {
    render(await chatsPageAt());

    expect(
      screen.getByRole("heading", { level: 2, name: "Chats" }),
    ).toBeInTheDocument();
  });
});

// Issue #472: the chats page lists every chat, project chats among them.
describe("use_case_list_all_chats", () => {
  test("lists her project chats beside her chats in no project", async () => {
    render(await chatsPageAt());

    expect(chatCard(FOX_CHAT.id)).toBeInTheDocument();
    expect(chatCard(CENTRAL_CHAT.id)).toBeInTheDocument();
  });
});

// Issue #472: a selector above the list chooses the project whose chats it
// shows, through the page's URL.
describe("use_case_filter_chats_by_project", () => {
  test("offers All and each of her projects by name, with All chosen", async () => {
    render(await chatsPageAt());

    const selector = projectSelector();
    expect(
      within(selector)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([ALL_PROJECTS, DONUT_PROJECT.name, FOX_PROJECT.name]);
    expect(selector).toHaveDisplayValue(ALL_PROJECTS);
  });

  test("sits above the list of chats", async () => {
    render(await chatsPageAt());

    expect(
      projectSelector().compareDocumentPosition(chatCard(FOX_CHAT.id)),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("puts the choice in the page's URL, through a form that gets the page", async () => {
    render(await chatsPageAt());

    const selector = projectSelector();
    const form = selector.closest("form");
    expect(selector).toHaveAttribute("name", "project");
    expect(
      within(selector).getByRole("option", { name: FOX_PROJECT.name }),
    ).toHaveValue(FOX_PROJECT.id);
    expect(form).not.toBeNull();
    expect(form?.method).toBe("get");
    expect(form?.getAttribute("action") ?? "/chat").toBe("/chat");
    expect(
      within(form ?? document.body).getByRole("button", { name: SHOW_CHATS }),
    ).toHaveAttribute("type", "submit");
  });

  test("shows the project in the URL as chosen", async () => {
    render(await chatsPageAt(FOX_PROJECT.id));

    expect(projectSelector()).toHaveDisplayValue(FOX_PROJECT.name);
  });

  test.each([
    ["a project id that isn't hers, as another user's", projectIdFixture()],
    ["a malformed project id", "not-a-project"],
  ])("reads %s as All", async (_kind, project) => {
    render(await chatsPageAt(project));

    expect(projectSelector()).toHaveDisplayValue(ALL_PROJECTS);
    expect(chatCard(CENTRAL_CHAT.id)).toBeInTheDocument();
  });
});

// Issue #472: a project chat carries its project's name in a badge.
describe("use_case_chat_project_badge", () => {
  test("badges a project chat with its project's name, beside its link", async () => {
    render(await chatsPageAt());

    const card = chatCard(FOX_CHAT.id);
    expect(within(card).getByText(FOX_CHAT.projectName)).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: FOX_CHAT.buddy.name }),
    ).toHaveAttribute("href", `/chats/${FOX_CHAT.id}`);
  });

  test("badges only the project chats, and a chat in no project not at all", async () => {
    render(await chatsPageAt());

    const central = chatCard(CENTRAL_CHAT.id);
    expect(
      within(chatCard(FOX_CHAT.id)).getByText(FOX_PROJECT.name),
    ).toBeInTheDocument();
    expect(
      within(central).queryByText(FOX_PROJECT.name),
    ).not.toBeInTheDocument();
    expect(
      within(central).queryByText(DONUT_PROJECT.name),
    ).not.toBeInTheDocument();
  });
});
