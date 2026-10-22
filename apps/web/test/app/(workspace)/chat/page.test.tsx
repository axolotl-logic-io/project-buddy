import { render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import StandaloneChatsLayout from "@/app/(workspace)/chat/layout.tsx";
import StandaloneChatsPage from "@/app/(workspace)/chat/page.tsx";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import type { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import type { listAllChats } from "@/chats/all-chats.ts";
import type { listProjects } from "@/projects/store.ts";
import {
  CHAT_NAME_COPY,
  NEW_CHAT_COPY,
  STANDALONE_CHATS_COPY,
} from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { chatNameFixture } from "../../../chats/chat-name-fixtures.ts";
import { projectIdFixture, userBuddyIdFixture } from "../../../id-fixtures.ts";
import { CENTRAL_CHAT, FOX_CHAT, FOX_PROJECT } from "../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
const stores = vi.hoisted(() => ({
  listAllChats: vi.fn<typeof listAllChats>(),
  listProjects: vi.fn<typeof listProjects>(),
  ownBuddyChoices: vi.fn<typeof ownBuddyChoices>(),
}));
vi.mock("@/chats/all-chats.ts", () => ({ listAllChats: stores.listAllChats }));
vi.mock("@/projects/store.ts", () => ({ listProjects: stores.listProjects }));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: stores.ownBuddyChoices,
}));
vi.mock("@/app/(workspace)/chat/actions.ts", () => ({
  startStandaloneChatAction: vi.fn(),
}));

const OWN_BUDDY: OwnBuddyChoice = {
  id: userBuddyIdFixture(),
  name: "My buddy",
};

function chatsPage(project?: string | string[]): Promise<JSX.Element> {
  return StandaloneChatsPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({ project }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  stores.listAllChats.mockResolvedValue([CENTRAL_CHAT, FOX_CHAT]);
  stores.listProjects.mockResolvedValue([FOX_PROJECT]);
  stores.ownBuddyChoices.mockResolvedValue([OWN_BUDDY]);
});

describe("standalone chat hub", () => {
  test("links each previous chat to its page", async () => {
    render(await chatsPage());
    expect(
      screen.getAllByRole("link", { name: CENTRAL_CHAT.buddy.name })[0],
    ).toHaveAttribute("href", `/chats/${CENTRAL_CHAT.id}`);
    expect(stores.listAllChats).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      undefined,
    );
  });
  test("the picker defaults to Hippy and offers her own buddies", async () => {
    render(await chatsPage());
    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: OWN_BUDDY.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: NEW_CHAT_COPY.start }),
    ).toBeEnabled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  test("heads the chat hub and links home", () => {
    render(
      <StandaloneChatsLayout params={Promise.resolve({})}>
        <p>{STANDALONE_CHATS_COPY.listHeading}</p>
      </StandaloneChatsLayout>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: STANDALONE_CHATS_COPY.heading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: STANDALONE_CHATS_COPY.homeLink }),
    ).toHaveAttribute("href", "/");
  });
});

test("offers a new chat without requiring a project", async () => {
  stores.listAllChats.mockResolvedValue([]);
  stores.listProjects.mockResolvedValue([]);
  render(await chatsPage());
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(
    screen.getByRole("option", { name: STANDALONE_CHATS_COPY.allProjects }),
  ).toBeInTheDocument();
  expect(screen.getByText(STANDALONE_CHATS_COPY.noChats)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: NEW_CHAT_COPY.start }),
  ).toBeEnabled();
});

test.each([undefined, projectIdFixture()])(
  "lists standalone chats without owning any projects (URL choice %s)",
  async (project) => {
    stores.listProjects.mockResolvedValue([]);
    stores.listAllChats.mockResolvedValue([CENTRAL_CHAT]);
    render(await chatsPage(project));

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/chats/${CENTRAL_CHAT.id}`,
    );
    expect(screen.getByRole("link")).toHaveAccessibleName(
      CENTRAL_CHAT.buddy.name,
    );
    expect(screen.queryByText(STANDALONE_CHATS_COPY.noChats)).toBeNull();
    expect(stores.listAllChats).toHaveBeenCalledExactlyOnceWith(
      SIGNED_IN_USER.id,
      undefined,
    );
    expect(
      screen.getByRole("button", { name: NEW_CHAT_COPY.start }),
    ).toBeEnabled();
  },
);

// Issue #471: the site calls its chats list "Chats".
describe("the chats list's heading", () => {
  test("heads the list of previous chats Chats", async () => {
    render(await chatsPage());

    expect(
      screen.getByRole("heading", { level: 2, name: "Chats" }),
    ).toBeInTheDocument();
  });
});

describe("project filtering leaves existing chat controls independent", () => {
  test("keeps an empty owned project selected without retrying an unfiltered query", async () => {
    stores.listAllChats.mockResolvedValue([]);
    render(await chatsPage(FOX_PROJECT.id));

    expect(screen.getByRole("combobox")).toHaveValue(FOX_PROJECT.id);
    expect(screen.getByText(STANDALONE_CHATS_COPY.noChats)).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
    expect(stores.listAllChats).toHaveBeenCalledExactlyOnceWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
  });

  test("a selected project belongs only to the GET filter, not the new-chat form", async () => {
    render(await chatsPage(FOX_PROJECT.id));
    const filterForm = screen.getByRole("combobox").closest("form");
    const newChatForm = screen
      .getByRole("button", { name: NEW_CHAT_COPY.start })
      .closest("form");
    if (filterForm === null || newChatForm === null) {
      throw new Error("Missing chat forms");
    }

    expect(filterForm).not.toBe(newChatForm);
    expect([...new FormData(filterForm)]).toEqual([
      ["project", FOX_PROJECT.id],
    ]);
    expect(new FormData(newChatForm).get("project")).toBeNull();
    expect(new FormData(newChatForm).get("buddyId")).toBe("hippy");
  });
});

describe("use_case_filter_chats_by_project", () => {
  test("renders an owned URL choice and submits it with native GET navigation", async () => {
    stores.listAllChats.mockResolvedValue([FOX_CHAT]);
    render(await chatsPage(FOX_PROJECT.id.toUpperCase()));
    const select = screen.getByRole<HTMLSelectElement>("combobox", {
      name: STANDALONE_CHATS_COPY.projectFilterLabel,
    });
    expect(select).toHaveValue(FOX_PROJECT.id);
    expect(stores.listAllChats).toHaveBeenCalledExactlyOnceWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    const form = select.closest("form");
    expect(form).toHaveAttribute("action", "/chat");
    expect(form).toHaveAttribute("method", "get");
    if (form === null) {
      throw new Error("Missing filter form");
    }
    expect(new FormData(form).get("project")).toBe(FOX_PROJECT.id);
    select.value = "";
    expect(new FormData(form).get("project")).toBe("");
    expect(
      screen.getByRole("button", { name: STANDALONE_CHATS_COPY.showChats }),
    ).toBeEnabled();
  });
  for (const project of [
    undefined,
    "",
    "bad-id",
    "00000000-0000-0000-0000-000000000000",
    projectIdFixture(),
    [FOX_PROJECT.id],
    [FOX_PROJECT.id, projectIdFixture()],
    [FOX_PROJECT.id, FOX_PROJECT.id],
    [],
  ]) {
    test(`falls back to All for ${JSON.stringify(project)}`, async () => {
      render(await chatsPage(project));
      expect(
        screen.getByRole("combobox", {
          name: STANDALONE_CHATS_COPY.projectFilterLabel,
        }),
      ).toHaveValue("");
      expect(stores.listAllChats).toHaveBeenCalledExactlyOnceWith(
        SIGNED_IN_USER.id,
        undefined,
      );
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual([STANDALONE_CHATS_COPY.allProjects, FOX_PROJECT.name]);
    });
  }
});

describe("use_case_chat_project_badge", () => {
  test("a named standalone chat has no badge beside an unnamed project chat", async () => {
    const name = chatNameFixture("Fox study");
    const projectName = 'Fox & <den> "study"';
    stores.listAllChats.mockResolvedValue([
      { ...CENTRAL_CHAT, name },
      { ...FOX_CHAT, projectName },
    ]);
    render(await chatsPage());

    const standalone = screen.getByRole("link", {
      name: CHAT_NAME_COPY.listTitle(name, CENTRAL_CHAT.buddy.name),
    });
    const project = screen.getByRole("link", {
      name: FOX_CHAT.buddy.name,
    });
    expect(standalone).toHaveAttribute("href", `/chats/${CENTRAL_CHAT.id}`);
    expect(project).toHaveAttribute("href", `/chats/${FOX_CHAT.id}`);
    expect(standalone.closest("li")).not.toHaveTextContent(projectName);
    expect(project.closest("li")).toHaveTextContent(projectName);
    expect(project).not.toHaveTextContent(projectName);
    expect(screen.getAllByText(projectName, { exact: true })).toHaveLength(1);
  });
  test.each([undefined, FOX_PROJECT.id])(
    "preserves a named conversation's accessible link name with filter %s",
    async (project) => {
      const name = chatNameFixture("Sculpting the fox");
      stores.listAllChats.mockResolvedValue([{ ...FOX_CHAT, name }]);
      render(await chatsPage(project));
      const link = screen.getByRole("link", {
        name: CHAT_NAME_COPY.listTitle(name, FOX_CHAT.buddy.name),
      });
      expect(link).toHaveAttribute("href", `/chats/${FOX_CHAT.id}`);
      expect(link).not.toHaveTextContent(FOX_PROJECT.name);
      expect(link.closest("li")).toHaveTextContent(FOX_PROJECT.name);
    },
  );
  test("shows project context only outside project chat links", async () => {
    render(await chatsPage());
    const links = screen.getAllByRole("link", { name: FOX_CHAT.buddy.name });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/chats/${CENTRAL_CHAT.id}`,
      `/chats/${FOX_CHAT.id}`,
    ]);
    expect(screen.getAllByText(FOX_PROJECT.name)).toHaveLength(2);
    for (const link of links) {
      expect(link).not.toHaveTextContent(FOX_PROJECT.name);
    }
    expect(links[0]?.closest("li")).not.toHaveTextContent(FOX_PROJECT.name);
    expect(links[1]?.closest("li")).toHaveTextContent(FOX_PROJECT.name);
  });
});
