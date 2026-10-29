import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { Chat, ProjectChat } from "@/chats/chat-rows.ts";
import { ChatProjectFilter } from "@/components/chat-project-filter.tsx";
import type { ProjectId } from "@/ids.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";
import { CENTRAL_CHAT, PROJECT_CHAT } from "./chat-list-fixtures.ts";

const SECOND_ID = projectIdFixture();
const EMPTY_ID = projectIdFixture();
const SECOND_CHAT: ProjectChat = {
  ...PROJECT_CHAT,
  id: chatIdFixture(),
  project: { id: SECOND_ID, name: "Character" },
};
const CHATS: readonly Chat[] = [CENTRAL_CHAT, PROJECT_CHAT, SECOND_CHAT];
const PROJECTS: readonly { id: ProjectId; name: string }[] = [
  { id: PROJECT_CHAT.project.id, name: PROJECT_CHAT.project.name },
  { id: SECOND_ID, name: "Character" },
  { id: EMPTY_ID, name: "Empty project" },
];
const ORIGINAL_URL: string = globalThis.location.href;

function links(): (string | null)[] {
  return page
    .getByRole("listitem")
    .elements()
    .map((item) => item.querySelector("a")?.getAttribute("href") ?? null);
}

afterEach(() => {
  globalThis.history.replaceState(null, "", ORIGINAL_URL);
  vi.restoreAllMocks();
});

describe("automatic chat filtering", () => {
  test("shows all chats on load and changes projects and All without submitting or fetching", async () => {
    await render(<ChatProjectFilter projects={PROJECTS} chats={CHATS} />);
    const allLinks = links();
    expect(allLinks).toEqual(CHATS.map((chat) => `/chats/${chat.id}`));
    await expect
      .element(page.getByRole("button", { name: "Show chats" }))
      .not.toBeInTheDocument();
    const fetch = vi.spyOn(globalThis, "fetch");
    const select = page.getByRole("combobox", {
      name: STANDALONE_CHATS_COPY.projectFilterLabel,
    });
    const { timeOrigin } = performance;
    await select.selectOptions(PROJECT_CHAT.project.id);
    expect(links()).toEqual([`/chats/${PROJECT_CHAT.id}`]);
    await expect
      .element(page.getByRole("listitem").getByText(PROJECT_CHAT.project.name))
      .toBeVisible();
    expect(
      page.getByRole("listitem").getByRole("link").element().textContent,
    ).not.toContain(PROJECT_CHAT.project.name);
    expect(new URL(globalThis.location.href).searchParams.get("project")).toBe(
      PROJECT_CHAT.project.id,
    );
    await select.selectOptions(SECOND_ID);
    expect(links()).toEqual([`/chats/${SECOND_CHAT.id}`]);
    await select.selectOptions("");
    expect(links()).toEqual(allLinks);
    expect(new URL(globalThis.location.href).searchParams.has("project")).toBe(
      false,
    );
    expect(performance.timeOrigin).toBe(timeOrigin);
    expect(fetch).not.toHaveBeenCalled();
  });

  test("an empty project stays selected and All restores the loaded chats", async () => {
    await render(<ChatProjectFilter projects={PROJECTS} chats={CHATS} />);
    const select = page.getByRole("combobox", {
      name: STANDALONE_CHATS_COPY.projectFilterLabel,
    });
    await select.selectOptions(EMPTY_ID);
    await expect.element(select).toHaveValue(EMPTY_ID);
    await expect
      .element(page.getByText(STANDALONE_CHATS_COPY.noChats))
      .toBeVisible();
    await expect.element(page.getByRole("listitem")).not.toBeInTheDocument();
    await select.selectOptions("");
    expect(links()).toHaveLength(CHATS.length);
  });

  test("a saved selection initially filters the list but retains all chats for switching", async () => {
    await render(
      <ChatProjectFilter
        projects={PROJECTS}
        chats={CHATS}
        selectedProjectId={SECOND_ID}
      />,
    );
    const select = page.getByRole("combobox", {
      name: STANDALONE_CHATS_COPY.projectFilterLabel,
    });
    await expect.element(select).toHaveValue(SECOND_ID);
    expect(links()).toEqual([`/chats/${SECOND_CHAT.id}`]);
    await select.selectOptions("");
    expect(links()).toEqual(CHATS.map((chat) => `/chats/${chat.id}`));
  });

  test("no chats shows the usual empty state immediately", async () => {
    await render(<ChatProjectFilter projects={[]} chats={[]} />);
    await expect
      .element(
        page.getByRole("combobox", {
          name: STANDALONE_CHATS_COPY.projectFilterLabel,
        }),
      )
      .toHaveValue("");
    await expect
      .element(page.getByText(STANDALONE_CHATS_COPY.noChats))
      .toBeVisible();
  });

  test("changing selection replaces repeated values and preserves unrelated query parameters and the fragment", async () => {
    const url = new URL(globalThis.location.href);
    url.searchParams.append("project", PROJECT_CHAT.project.id);
    url.searchParams.append("project", SECOND_ID);
    url.searchParams.set("keep", "yes");
    url.hash = "chats";
    globalThis.history.replaceState(null, "", url);
    await render(<ChatProjectFilter projects={PROJECTS} chats={CHATS} />);
    await page
      .getByRole("combobox", { name: STANDALONE_CHATS_COPY.projectFilterLabel })
      .selectOptions(SECOND_ID);
    const selectedUrl = new URL(globalThis.location.href);
    expect(selectedUrl.searchParams.getAll("project")).toEqual([SECOND_ID]);
    expect(selectedUrl.searchParams.get("keep")).toBe("yes");
    expect(selectedUrl.hash).toBe("#chats");
  });
});
