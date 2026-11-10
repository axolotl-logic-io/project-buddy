import { and, eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import ChatsPage from "@/app/(workspace)/chat/page.tsx";
import {
  createStandaloneChat,
  listStandaloneChats,
} from "@/chats/standalone-chat.ts";
import { listChats } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../../../../support/id-fixtures.ts";
import { expectRedirect } from "../../../test-database/navigation-test-kit.ts";
import {
  lapsed,
  signIn,
  signOut,
} from "../../../test-database/session-test-kit.ts";
import { twoUsers } from "../../../test-database/two-users-test-kit.ts";

const CHAT_HREF = /href="(?<href>\/chats\/[^"]+)"/gu;
const PROJECT_OPTION = /<option\b[^>]*>[^<]*<\/option>/gu;
// The project filter's select, whose options PROJECT_OPTION counts.
const PROJECT_FILTER = /<select\b[^>]*name="project"[^>]*>.*?<\/select>/su;
// The new-chat form's fields, which the page shows only in its dialog.
const NEW_CHAT_FIELD = /name="(?:activityId|projectId|constructId)"/u;
const NEW_CHAT_BUTTON =
  /<button\b[^>]*aria-haspopup="dialog"[^>]*>.*?New adventure<\/button>/su;
const NEW_CHAT_BUTTONS =
  /<button\b[^>]*aria-haspopup="dialog"[^>]*>.*?New adventure<\/button>/gsu;
// The All adventures tab, chosen, which the list's tabs lead with.
const ALL_ADVENTURES_SELECTED =
  /<button\b[^>]*role="tab"[^>]*aria-selected="true"[^>]*>All adventures<\/button>/u;
const SELECTED_ALL = /<option value="" selected="">All<\/option>/u;
const OLDEST = new Date("2026-01-01T00:00:00Z");
const OLDER_PROJECT = new Date("2026-01-02T00:00:00Z");
const OTHER_PROJECT = new Date("2026-01-03T00:00:00Z");
const NEWER_PROJECT = new Date("2026-01-04T00:00:00Z");
const NEWEST = new Date("2026-01-05T00:00:00Z");

interface MixedChats {
  readonly owner: User;
  readonly other: User;
  readonly project: Project;
  readonly secondProject: Project;
  readonly emptyProject: Project;
  readonly foreignProject: Project;
  readonly projectChats: readonly ChatId[];
  readonly newestFirst: readonly string[];
}

async function createdAt(owner: UserId, id: ChatId, time: Date): Promise<void> {
  await getDb()
    .update(chats)
    .set({ createdAt: time })
    .where(and(eq(chats.id, id), chatOpenTo(owner)));
}

async function mixedChats(): Promise<MixedChats> {
  const { her, herData, other, otherData } = await twoUsers();
  const [project, secondProject, emptyProject, foreignProject] =
    await Promise.all([
      herData.project("Own fox"),
      herData.project("Own donut"),
      herData.project("Own empty"),
      otherData.project("Private project"),
    ]);
  const [older, olderProjectChat, otherProjectChat, newerProjectChat, newer] =
    await Promise.all([
      createStandaloneChat(her.id),
      herData.chat(project),
      herData.chat(secondProject),
      herData.chat(project),
      createStandaloneChat(her.id),
      otherData.chat(foreignProject),
      createStandaloneChat(other.id),
    ]);
  await Promise.all([
    createdAt(her.id, older.id, OLDEST),
    createdAt(her.id, olderProjectChat.id, OLDER_PROJECT),
    createdAt(her.id, otherProjectChat.id, OTHER_PROJECT),
    createdAt(her.id, newerProjectChat.id, NEWER_PROJECT),
    createdAt(her.id, newer.id, NEWEST),
  ]);
  return {
    owner: her,
    other,
    project,
    secondProject,
    emptyProject,
    foreignProject,
    projectChats: [newerProjectChat.id, olderProjectChat.id],
    newestFirst: [
      newer.id,
      newerProjectChat.id,
      otherProjectChat.id,
      olderProjectChat.id,
      older.id,
    ].map((id) => `/chats/${id}`),
  };
}

async function pageHtml(project?: string | string[]): Promise<string> {
  return renderToStaticMarkup(
    await ChatsPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ project }),
    }),
  );
}

// The project filter's options in the page's html.
function filterOptions(html: string): RegExpMatchArray | null {
  return (PROJECT_FILTER.exec(html)?.[0] ?? "").match(PROJECT_OPTION);
}

function chatLinks(html: string): string[] {
  return Array.from(html.matchAll(CHAT_HREF), ([, href]) => href ?? "");
}

describe("use_case_list_all_chats", () => {
  test("assembles mixed owned chats newest first, without foreign chats or choices", async () => {
    const fixture = await mixedChats();
    const ownProjects = [
      fixture.project,
      fixture.secondProject,
      fixture.emptyProject,
    ];
    const html = await pageHtml();
    expect(chatLinks(html)).toEqual(fixture.newestFirst);
    expect(html).toMatch(SELECTED_ALL);
    for (const project of ownProjects) {
      expect(html).toContain(project.name);
    }
    expect(filterOptions(html)).toHaveLength(ownProjects.length + 1);
    expect(html).not.toContain(fixture.foreignProject.name);
    expect(html).not.toContain(fixture.foreignProject.id);
    expect(
      (await listChats(fixture.owner.id, fixture.project.id)).map(
        ({ id }) => id,
      ),
    ).toEqual(fixture.projectChats);
    const projectsAfterViewing = await listProjects(fixture.owner.id);
    expect(projectsAfterViewing).toHaveLength(ownProjects.length);
    expect(projectsAfterViewing).toEqual(expect.arrayContaining(ownProjects));
    expect(await listStandaloneChats(fixture.owner.id)).toHaveLength(2);
    await signIn(fixture.other);
    const otherHtml = await pageHtml();
    expect(chatLinks(otherHtml)).toHaveLength(2);
    for (const path of fixture.newestFirst) {
      expect(otherHtml).not.toContain(path);
    }
    expect(otherHtml).not.toContain(fixture.project.id);
    expect(otherHtml).not.toContain(fixture.secondProject.id);
  });

  test("leads with the list and keeps the new-chat form behind its button", async () => {
    const fixture = await mixedChats();
    const html = await pageHtml();
    expect(html).toMatch(NEW_CHAT_BUTTON);
    expect(html).not.toMatch(NEW_CHAT_FIELD);
    expect(html).toMatch(ALL_ADVENTURES_SELECTED);
    expect(chatLinks(html)).toEqual(fixture.newestFirst);
  });

  test("before the first adventure, the page welcomes her with New adventure and no filters, and creates nothing", async () => {
    const { her, herData } = await twoUsers();
    const html = await pageHtml();
    expect(welcomeOf(html)).toEqual(WELCOME);
    expect(await listProjects(her.id)).toEqual([]);
    expect(await listStandaloneChats(her.id)).toEqual([]);

    const quest = await herData.project("Quest with no adventures yet");
    const withQuest = await pageHtml();
    expect(welcomeOf(withQuest)).toEqual(WELCOME);
    expect(withQuest).not.toContain(quest.name);
    expect(await listStandaloneChats(her.id)).toEqual([]);
  });
});

// What the page shows of the welcome before the user's first adventure: it
// should have its heading and one New adventure button, and no list, tabs,
// quest selector or new-adventure fields outside the dialog.
function welcomeOf(html: string): Record<string, unknown> {
  return {
    links: chatLinks(html),
    heading: html.includes(STANDALONE_CHATS_COPY.emptyHeading),
    filter: PROJECT_FILTER.test(html),
    tabs: html.includes('role="tablist"'),
    newAdventureButtons: html.match(NEW_CHAT_BUTTONS)?.length ?? 0,
    fields: NEW_CHAT_FIELD.test(html),
  };
}

const WELCOME = {
  links: [],
  heading: true,
  filter: false,
  tabs: false,
  newAdventureButtons: 1,
  fields: false,
};

test("an owner with no data sees an empty All view even through a foreign filter URL", async () => {
  const { her, other, otherData } = await twoUsers();
  const foreign = await otherData.project("Private fox den");
  await otherData.chat(foreign);
  await createStandaloneChat(other.id);

  const all = await pageHtml();
  const shared = await pageHtml(foreign.id);
  for (const html of [all, shared]) {
    expect(welcomeOf(html)).toEqual(WELCOME);
    expect(html).not.toContain(foreign.id);
    expect(html).not.toContain(foreign.name);
  }
  expect(await listProjects(her.id)).toEqual([]);
  expect(await listStandaloneChats(her.id)).toEqual([]);
});

test("resolves ids, not duplicate project names or the All label", async () => {
  const { herData, otherData } = await twoUsers();
  const [first, second, foreign] = await Promise.all([
    herData.project("All"),
    herData.project("All"),
    otherData.project("All"),
  ]);
  const [firstChat, secondChat, foreignChat] = await Promise.all([
    herData.chat(first),
    herData.chat(second),
    otherData.chat(foreign),
  ]);
  const all = await pageHtml();
  expect(filterOptions(all)).toHaveLength([first, second].length + 1);
  expect(chatLinks(all)).toEqual(
    expect.arrayContaining([
      `/chats/${firstChat.id}`,
      `/chats/${secondChat.id}`,
    ]),
  );
  expect(chatLinks(all)).toHaveLength(2);
  const selected = await pageHtml(second.id);
  expect(chatLinks(selected)).toEqual([`/chats/${secondChat.id}`]);
  expect(selected).toContain(
    `<option value="${second.id}" selected="">All</option>`,
  );
  expect(selected).not.toContain(foreign.id);
  expect(selected).not.toContain(foreignChat.id);
  const foreignUrl = await pageHtml(foreign.id);
  expect(foreignUrl).toMatch(SELECTED_ALL);
  expect(chatLinks(foreignUrl)).toEqual(chatLinks(all));
  expect(filterOptions(foreignUrl)).toEqual(filterOptions(all));
});

describe("use_case_filter_chats_by_project", () => {
  test("keeps an owned URL choice across fresh renders, including uppercase ids and empty projects", async () => {
    const fixture = await mixedChats();
    const pages = await Promise.all(
      [
        fixture.project.id,
        fixture.project.id,
        fixture.project.id.toUpperCase(),
      ].map(pageHtml),
    );
    for (const html of pages) {
      expect(chatLinks(html)).toEqual(
        fixture.projectChats.map((id) => `/chats/${id}`),
      );
      expect(html).toContain(
        `<option value="${fixture.project.id}" selected="">`,
      );
    }
    const empty = await pageHtml(fixture.emptyProject.id);
    expect(chatLinks(empty)).toEqual([]);
    expect(empty).toContain(
      `<option value="${fixture.emptyProject.id}" selected="">`,
    );
    expect(empty).toContain(STANDALONE_CHATS_COPY.noChats);
    const all = await pageHtml("");
    expect(all).toMatch(SELECTED_ALL);
    expect(chatLinks(all)).toEqual(fixture.newestFirst);
  });

  test("every invalid URL is indistinguishable from All, including foreign project existence", async () => {
    const fixture = await mixedChats();
    const all = await pageHtml();
    const pages = await Promise.all(
      [
        undefined,
        "",
        "bad-id",
        projectIdFixture(),
        fixture.foreignProject.id,
        fixture.foreignProject.id.toUpperCase(),
        [fixture.project.id],
        [fixture.project.id, fixture.secondProject.id],
        [fixture.project.id, fixture.project.id],
        [],
      ].map(pageHtml),
    );
    for (const html of pages) {
      expect(chatLinks(html)).toEqual(fixture.newestFirst);
      expect(html).toMatch(SELECTED_ALL);
      expect(html).not.toContain(fixture.foreignProject.id);
      expect(html).not.toContain(fixture.foreignProject.name);
      expect(chatLinks(html)).toEqual(chatLinks(all));
      expect(filterOptions(html)).toEqual(filterOptions(all));
    }
  });
});

test("a saved project URL still requires a current signed-in session", async () => {
  const { her, herData } = await twoUsers();
  const project = await herData.project();
  signOut();
  await expect(
    expectRedirect(() => pageHtml(project.id), "/login"),
  ).resolves.toBeUndefined();
  await lapsed(her);
  await expect(
    expectRedirect(() => pageHtml(project.id), "/login"),
  ).resolves.toBeUndefined();
});

test("a shared project URL does not transfer access to the receiving user", async () => {
  const fixture = await mixedChats();
  expect(chatLinks(await pageHtml(fixture.project.id))).toEqual(
    fixture.projectChats.map((id) => `/chats/${id}`),
  );
  await signIn(fixture.other);
  const all = await pageHtml();
  const shared = await pageHtml(fixture.project.id);
  expect(shared).toMatch(SELECTED_ALL);
  expect(chatLinks(shared)).toEqual(chatLinks(all));
  expect(chatLinks(shared)).toHaveLength(2);
  expect(shared).toContain(fixture.foreignProject.name);
  for (const project of [fixture.project, fixture.secondProject]) {
    expect(shared).not.toContain(project.id);
    expect(shared).not.toContain(project.name);
  }
  for (const path of fixture.newestFirst) {
    expect(shared).not.toContain(path);
  }
});
