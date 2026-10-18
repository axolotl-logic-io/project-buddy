import { and, eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import ChatsPage from "@/app/(workspace)/chat/page.tsx";
import { createCentralChat, listCentralChats } from "@/chats/central-chat.ts";
import { listChats } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { projectIdFixture } from "../../../id-fixtures.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";
import { twoUsers } from "../../../test-database/two-users-test-kit.ts";

const CHAT_HREF = /href="(?<href>\/chats\/[^"]+)"/gu;
const SELECTED_ALL = /<option value="" selected="">All<\/option>/u;
const OLDEST = new Date("2026-01-01T00:00:00Z");
const MIDDLE = new Date("2026-01-02T00:00:00Z");
const NEWEST = new Date("2026-01-03T00:00:00Z");

async function createdAt(owner: UserId, id: ChatId, time: Date): Promise<void> {
  await getDb()
    .update(chats)
    .set({ createdAt: time })
    .where(and(eq(chats.id, id), chatOwnedBy(owner)));
}

async function mixedChats(): Promise<{
  owner: User;
  other: User;
  project: Project;
  emptyProject: Project;
  foreignProject: Project;
  projectChat: ChatId;
  newestFirst: readonly string[];
}> {
  const { her, herData, other, otherData } = await twoUsers();
  const [project, emptyProject, foreignProject] = await Promise.all([
    herData.project("Own fox"),
    herData.project("Own empty"),
    otherData.project("Private project"),
  ]);
  const [older, projectChat, newer] = await Promise.all([
    createCentralChat(her.id),
    herData.chat(project),
    createCentralChat(her.id),
    otherData.chat(foreignProject),
    createCentralChat(other.id),
  ]);
  await Promise.all([
    createdAt(her.id, older.id, OLDEST),
    createdAt(her.id, projectChat.id, MIDDLE),
    createdAt(her.id, newer.id, NEWEST),
  ]);
  return {
    owner: her,
    other,
    project,
    emptyProject,
    foreignProject,
    projectChat: projectChat.id,
    newestFirst: [newer.id, projectChat.id, older.id].map(
      (id) => `/chats/${id}`,
    ),
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

function chatLinks(html: string): string[] {
  return Array.from(html.matchAll(CHAT_HREF), ([, href]) => href ?? "");
}

describe("use_case_list_all_chats", () => {
  test("assembles mixed owned chats newest first, without foreign chats or choices", async () => {
    const fixture = await mixedChats();
    const html = await pageHtml();
    expect(chatLinks(html)).toEqual(fixture.newestFirst);
    expect(html).toMatch(SELECTED_ALL);
    expect(html).toContain(fixture.project.name);
    expect(html).toContain(fixture.emptyProject.name);
    expect(html).not.toContain(fixture.foreignProject.name);
    expect(html).not.toContain(fixture.foreignProject.id);
    expect(
      (await listChats(fixture.owner.id, fixture.project.id)).map(
        ({ id }) => id,
      ),
    ).toEqual([fixture.projectChat]);
    await signIn(fixture.other);
    const otherHtml = await pageHtml();
    expect(chatLinks(otherHtml)).toHaveLength(2);
    for (const path of fixture.newestFirst) {
      expect(otherHtml).not.toContain(path);
    }
    expect(otherHtml).not.toContain(fixture.project.id);
  });

  test("an empty list does not create a conversation", async () => {
    const { her } = await twoUsers();
    expect(chatLinks(await pageHtml())).toEqual([]);
    expect(await listProjects(her.id)).toEqual([]);
    expect(await listCentralChats(her.id)).toEqual([]);
    expect(await pageHtml()).toContain(STANDALONE_CHATS_COPY.noChats);
  });
});

describe("use_case_filter_chats_by_project", () => {
  test("keeps an owned URL choice across fresh renders, including uppercase ids and empty projects", async () => {
    const fixture = await mixedChats();
    const pages = await Promise.all(
      [fixture.project.id, fixture.project.id.toUpperCase()].map(pageHtml),
    );
    for (const html of pages) {
      expect(chatLinks(html)).toEqual([`/chats/${fixture.projectChat}`]);
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
  });

  test("every invalid URL is indistinguishable from All, including foreign project existence", async () => {
    const fixture = await mixedChats();
    const all = await pageHtml();
    const pages = await Promise.all(
      [
        "",
        "bad-id",
        projectIdFixture(),
        fixture.foreignProject.id,
        fixture.foreignProject.id.toUpperCase(),
        [fixture.project.id],
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
    }
  });
});
