// use_case_private_data on the pages, with two users side by side, each
// signed in as their own account: another user's quest, memory and chat
// pages are not found, exactly as an unknown id's are, and the quests
// list and the New Chat picker show each user only their own quests. The
// other private-data*.server.test.ts files cover constructs, chats, Server
// Actions and the stores.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import QuestsPage from "@/app/(workspace)/quests/(list)/page.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { privateChat } from "@/conversations/private-chat.ts";
import type { Quest } from "@/quests/store.ts";
import { HOME_PATH } from "@/routes.ts";
import { chatIdFixture, questIdFixture } from "../../support/id-fixtures.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

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

function projectPage(questId: string): Promise<unknown> {
  return QuestPage(pageArgs({ questId }));
}

function chatPage(chatId: string): Promise<unknown> {
  return ChatPage(pageArgs({ chatId }));
}

// The signed-in user's quests page, as HTML.
async function projectsHtml(): Promise<string> {
  return renderToStaticMarkup(
    await QuestsPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    }),
  );
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

// The names of the quests that the HTML holds.
function projectsIn(html: string, quests: readonly Quest[]): string[] {
  return quests.flatMap(({ name }) => {
    if (html.includes(name)) {
      return [name];
    }
    return [];
  });
}

describe("use_case_private_data", () => {
  // Her quest chat's old address and her standalone chat's still open for
  // her, at the quest and at her Chat.
  test("another user's project, memory and chat pages can't be found", async () => {
    const { her, herData, other } = await twoUsers();
    const hers = await herData.quest();
    const herChat = await herData.chat(hers);
    const herStandalone = await privateChat(her.id);
    await signIn(other);

    await expectNotFoundAsUnknown(projectPage, hers.id, questIdFixture());
    await expectNotFoundAsUnknown(chatPage, herChat.id, chatIdFixture());
    await expectNotFoundAsUnknown(chatPage, herStandalone.id, chatIdFixture());

    await signIn(her);
    await expect(projectPage(hers.id)).resolves.toBeDefined();
    await expectRedirect(() => chatPage(herChat.id), `/quests/${hers.id}`);
    await expectRedirect(() => chatPage(herStandalone.id), HOME_PATH);
  });

  test("each sees only their own projects", async () => {
    const { herData, other, otherData } = await twoUsers();
    const quests = [await herData.quest(), await otherData.quest()];
    const [hers, theirs] = quests.map(({ name }) => name);

    expect(projectsIn(await projectsHtml(), quests)).toEqual([hers]);
    await signIn(other);
    expect(projectsIn(await projectsHtml(), quests)).toEqual([theirs]);
  });
});
