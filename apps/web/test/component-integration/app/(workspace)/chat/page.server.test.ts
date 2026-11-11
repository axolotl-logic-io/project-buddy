// Chat, the user's one private conversation, and the old adventure
// addresses that now lead to Chat or to a quest, in the test database with
// the mock construct.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import StandaloneChatPage from "@/app/(workspace)/chat/page.tsx";
import OldChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import OldNewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { startQuestConversation } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import { addProjectMember } from "@/projects/members-store.ts";
import type { Project } from "@/projects/store.ts";
import { goldSpent } from "../../../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { constructReply } from "../../../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";
import { twoUsers } from "../../../test-database/two-users-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const SAID = "a private idea about foxes";

async function chatHtml(): Promise<string> {
  return renderToStaticMarkup(await StandaloneChatPage());
}

function openOld(chatId: string): Promise<never> {
  return OldChatPage({
    params: Promise.resolve({ chatId }),
    searchParams: Promise.resolve({}),
  });
}

// The quest's one conversation, opened for its owner.
async function questConversationId(
  owner: UserId,
  project: Project,
): Promise<string> {
  const started = await startQuestConversation(owner, project.id);
  if (started.kind !== "started") {
    throw new Error(`The quest's conversation didn't open: ${started.kind}`);
  }
  return started.conversation.id;
}

describe("use_case_standalone_chat", () => {
  test("opening Chat again continues one private conversation, spending nothing on the way in", async () => {
    const { her, other } = await twoUsers();

    const first = await chatHtml();
    const again = await chatHtml();
    const chat = await privateChat(her.id);

    expect(first).not.toContain("New adventure");
    expect(again).not.toContain("New adventure");
    expect(await listMessages(her.id, chat.id)).toEqual([]);
    expect(await goldSpent(her)).toBe(0);

    await constructReply(chat.id, SAID);
    expect((await privateChat(her.id)).id).toBe(chat.id);
    expect(await chatHtml()).toContain(SAID);

    await signIn(other);
    expect(await chatHtml()).not.toContain(SAID);
    expect((await privateChat(other.id)).id).not.toBe(chat.id);
    await expectNotFound(() => openOld(chat.id));
  });

  test("an old adventure address opens her Chat or the quest she can open, and reveals nothing else", async () => {
    const { her, herData, other, otherData } = await twoUsers();
    const [ownQuest, sharedQuest, foreignQuest] = await Promise.all([
      herData.project("Own fox"),
      otherData.project("Shared fox"),
      otherData.project("Private fox"),
    ]);
    await addProjectMember(her.id, sharedQuest.id);
    const [chat, own, shared, foreign] = await Promise.all([
      privateChat(her.id),
      questConversationId(her.id, ownQuest),
      questConversationId(other.id, sharedQuest),
      questConversationId(other.id, foreignQuest),
    ]);

    await Promise.all([
      expectRedirect(() => openOld(chat.id), "/chat"),
      expectRedirect(() => openOld(own), `/projects/${ownQuest.id}`),
      expectRedirect(() => openOld(shared), `/projects/${sharedQuest.id}`),
      expectNotFound(() => openOld(foreign)),
      expectNotFound(() => openOld("not-a-chat")),
      expectNotFound(() => openOld(crypto.randomUUID())),
    ]);
  });

  test("the old new-adventure address opens Chat and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);

    await expectRedirect(() => OldNewChatPage(), "/chat");

    expect(await goldSpent(user)).toBe(0);
  });
});
