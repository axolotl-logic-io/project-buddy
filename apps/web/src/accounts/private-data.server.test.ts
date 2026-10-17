// use_case_private_data on the pages, with two users side by side, each
// signed in as their own account: another user's project, memory and chat
// pages are not found, exactly as an unknown id's are, and the projects
// list and the New Chat picker show each user only their own projects. The
// other private-data*.server.test.ts files cover buddies, chats, Server
// Actions and the stores.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import ProjectsPage from "@/app/(workspace)/projects/(list)/page.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import MemoryPage from "@/app/(workspace)/projects/[projectId]/memory/page.tsx";
import { getOrCreateCentralChat } from "@/chats/central-chat.ts";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import type { Project } from "@/projects/store.ts";
import { expectNotFound } from "@/test-database/navigation-test-kit.ts";
import { signIn } from "@/test-database/session-test-kit.ts";
import { twoUsers } from "./two-users-test-kit.ts";

// What a page component is called with: its route's params, and no search
// parameters.
interface PageArgs<Params> {
  readonly params: Promise<Params>;
  readonly searchParams: Promise<Record<string, never>>;
}

// A page that shows the row with this id.
type IdPage = (id: string) => Promise<unknown>;

function pageArgs<Params>(params: Params): PageArgs<Params> {
  return { params: Promise.resolve(params), searchParams: Promise.resolve({}) };
}

function projectPage(projectId: string): Promise<unknown> {
  return ProjectPage(pageArgs({ projectId }));
}

function memoryPage(projectId: string): Promise<unknown> {
  return MemoryPage(pageArgs({ projectId }));
}

function chatPage(chatId: string): Promise<unknown> {
  return ChatPage(pageArgs({ chatId }));
}

// The signed-in user's projects page, as HTML.
async function projectsHtml(): Promise<string> {
  return renderToStaticMarkup(await ProjectsPage());
}

// The signed-in user's New Chat page, with its project picker, as HTML.
async function newChatHtml(): Promise<string> {
  return renderToStaticMarkup(await NewChatPage(pageArgs({})));
}

// The page is not found for the unknown id, and then for the id.
async function expectNotFoundAsUnknown(
  page: IdPage,
  id: string,
  unknownId: string,
): Promise<void> {
  await expectNotFound(() => page(unknownId));
  await expectNotFound(() => page(id));
}

// The names of the projects that the HTML holds.
function projectsIn(html: string, projects: readonly Project[]): string[] {
  return projects.flatMap(({ name }) => {
    if (html.includes(name)) {
      return [name];
    }
    return [];
  });
}

describe("use_case_private_data", () => {
  // Her project chat's page, and her central chat's; they still open for
  // her.
  test("another user's project, memory and chat pages can't be found", async () => {
    const { her, herData, other } = await twoUsers();
    const hers = await herData.project();
    const herChat = await herData.chat(hers);
    const herCentral = await getOrCreateCentralChat(her.id);
    await signIn(other);

    await expectNotFoundAsUnknown(projectPage, hers.id, projectIdFixture());
    await expectNotFoundAsUnknown(memoryPage, hers.id, projectIdFixture());
    await expectNotFoundAsUnknown(chatPage, herChat.id, chatIdFixture());
    await expectNotFoundAsUnknown(chatPage, herCentral.id, chatIdFixture());

    await signIn(her);
    await expect(projectPage(hers.id)).resolves.toBeDefined();
    await expect(memoryPage(hers.id)).resolves.toBeDefined();
    await expect(chatPage(herChat.id)).resolves.toBeDefined();
    await expect(chatPage(herCentral.id)).resolves.toBeDefined();
  });

  test("each sees only their own projects", async () => {
    const { herData, other, otherData } = await twoUsers();
    const projects = [await herData.project(), await otherData.project()];
    const [hers, theirs] = projects.map(({ name }) => name);

    expect(projectsIn(await projectsHtml(), projects)).toEqual([hers]);
    await signIn(other);
    expect(projectsIn(await projectsHtml(), projects)).toEqual([theirs]);
  });

  test("each can start a new chat only in their own projects", async () => {
    const { herData, other, otherData } = await twoUsers();
    const projects = [await herData.project(), await otherData.project()];
    const [hers, theirs] = projects.map(({ name }) => name);

    expect(projectsIn(await newChatHtml(), projects)).toEqual([hers]);
    await signIn(other);
    expect(projectsIn(await newChatHtml(), projects)).toEqual([theirs]);
  });
});
