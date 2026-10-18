// Issue #472: the chats page (/chat) lists every chat of the user's, project
// chats and chats in no project together, and filters them by one of her
// projects, with two users side by side so neither sees the other's chats or
// projects. The list's badges and its selector's layout are checked by the
// page's component test (test/app/(workspace)/chat/page.test.tsx).
import type { JSX } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import StandaloneChatsPage from "@/app/(workspace)/chat/page.tsx";
import { listAllChats } from "@/chats/all-chats.ts";
import { createCentralChat } from "@/chats/central-chat.ts";
import type { ChatId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// What the chats page is called with: no route parameters, and its search
// parameters, of which it reads `project`.
interface ChatsPageArgs {
  readonly params: Promise<Record<string, never>>;
  readonly searchParams: Promise<{ project?: string }>;
}

// Her chats beside the other user's.
interface TwoUsersChats {
  readonly her: User;
  readonly donut: Project;
  readonly fox: Project;
  readonly donutChat: ChatId;
  readonly foxChat: ChatId;
  // Her central chats, the newer first.
  readonly centralChats: readonly [ChatId, ChatId];
  // All her chats, newest first.
  readonly newestFirst: readonly ChatId[];
  readonly theirProject: Project;
  readonly theirChats: readonly ChatId[];
}

const chatsPage: (args: ChatsPageArgs) => Promise<JSX.Element> =
  StandaloneChatsPage;

const CHAT_LINK = /href="\/chats\/(?<id>[0-9a-f-]{36})"/gu;
const MALFORMED_PROJECT_ID = "not-a-project";

// The signed-in user's chats page, at /chat or /chat?project=<project>, as
// HTML.
async function chatsHtml(project?: string): Promise<string> {
  let searchParams: Promise<{ project?: string }> = Promise.resolve({});
  if (project !== undefined) {
    searchParams = Promise.resolve({ project });
  }
  return renderToStaticMarkup(
    await chatsPage({ params: Promise.resolve({}), searchParams }),
  );
}

// The ids of the chats the page links to, in the page's order.
function linkedChats(html: string): string[] {
  return [...html.matchAll(CHAT_LINK)].flatMap(({ groups }) => {
    const { id } = groups ?? {};
    return id ?? [];
  });
}

// Her data, made in this order: a central chat, a chat in her donut
// project, another central chat, and a chat in her fox project; then the
// other user's project, with a chat in it, and their central chat. She is
// signed in.
async function herChatsBesideTheirs(): Promise<TwoUsersChats> {
  const { her, herData, other, otherData } = await twoUsers();
  const donut = await herData.project(`Donut ${crypto.randomUUID()}`);
  const fox = await herData.project(`Fox ${crypto.randomUUID()}`);
  const theirProject = await otherData.project(`Theirs ${crypto.randomUUID()}`);
  const firstCentral = await createCentralChat(her.id);
  const donutChat = await herData.chat(donut);
  const secondCentral = await createCentralChat(her.id);
  const foxChat = await herData.chat(fox);
  const theirChat = await otherData.chat(theirProject);
  const theirCentral = await createCentralChat(other.id);
  return {
    her,
    donut,
    fox,
    donutChat: donutChat.id,
    foxChat: foxChat.id,
    centralChats: [secondCentral.id, firstCentral.id],
    newestFirst: [foxChat.id, secondCentral.id, donutChat.id, firstCentral.id],
    theirProject,
    theirChats: [theirChat.id, theirCentral.id],
  };
}

describe("use_case_list_all_chats", () => {
  test("lists her project chats and chats in no project together, newest first, and none of another user's", async () => {
    const { her, newestFirst } = await herChatsBesideTheirs();

    expect((await listAllChats(her.id)).map(({ id }) => id)).toEqual(
      newestFirst,
    );
  });

  test("gives each project chat its project's name, and a chat in no project none", async () => {
    const { her, donut, fox, donutChat, foxChat, centralChats } =
      await herChatsBesideTheirs();

    expect(
      (await listAllChats(her.id)).map((chat) => {
        if (chat.kind === "project") {
          return { id: chat.id, projectName: chat.projectName };
        }
        return { id: chat.id, projectName: undefined };
      }),
    ).toEqual([
      { id: foxChat, projectName: fox.name },
      { id: centralChats[0], projectName: undefined },
      { id: donutChat, projectName: donut.name },
      { id: centralChats[1], projectName: undefined },
    ]);
  });

  test("the chats page links to every chat of hers, newest first, and to none of another user's", async () => {
    const { newestFirst, theirProject } = await herChatsBesideTheirs();

    const html = await chatsHtml();

    expect(linkedChats(html)).toEqual(newestFirst);
    expect(html).not.toContain(theirProject.name);
  });
});

describe("use_case_filter_chats_by_project", () => {
  test("lists only the chats of the project it is given", async () => {
    const { her, donut, donutChat } = await herChatsBesideTheirs();

    expect((await listAllChats(her.id, donut.id)).map(({ id }) => id)).toEqual([
      donutChat,
    ]);
  });

  test("lists no chats for another user's project", async () => {
    const { her, theirProject } = await herChatsBesideTheirs();

    expect(await listAllChats(her.id, theirProject.id)).toEqual([]);
  });

  test("the chats page shows only the chats of the project in its URL", async () => {
    const { donut, fox, donutChat, foxChat } = await herChatsBesideTheirs();

    expect(linkedChats(await chatsHtml(fox.id))).toEqual([foxChat]);
    expect(linkedChats(await chatsHtml(donut.id))).toEqual([donutChat]);
  });

  test("the chats page shows all her chats for another user's project id, as for an unknown one", async () => {
    const { newestFirst, theirProject } = await herChatsBesideTheirs();

    const html = await chatsHtml(theirProject.id);

    expect(linkedChats(html)).toEqual(newestFirst);
    expect(html).not.toContain(theirProject.name);
  });

  test("the chats page shows all her chats for a malformed project id", async () => {
    const { newestFirst } = await herChatsBesideTheirs();

    expect(linkedChats(await chatsHtml(MALFORMED_PROJECT_ID))).toEqual(
      newestFirst,
    );
  });

  test("the chats page offers her projects, and not another user's, to filter by", async () => {
    const { donut, fox, theirProject } = await herChatsBesideTheirs();

    const html = await chatsHtml();

    expect(html).toContain(`value="${donut.id}"`);
    expect(html).toContain(`value="${fox.id}"`);
    expect(html).not.toContain(theirProject.id);
  });
});
