// Chat, the user's one private conversation, and the old adventure
// addresses that now lead to Chat or to a quest, in the test database with
// the mock construct.
import { describe, expect, test, vi } from "vitest";
import StandaloneChatPage from "@/app/(workspace)/chat/page.tsx";
import OldChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import OldNewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { resolveConversation } from "@/conversations/resolve.ts";
import {
  readQuestConversation,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { addProjectMember } from "@/projects/members-store.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { chatSummaryDraft } from "@/start-work/chat-summary-draft.ts";
import { goldSpent } from "../../../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import {
  constructReply,
  formOf,
} from "../../../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";
import { twoUsers } from "../../../test-database/two-users-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const SAID = "a private idea about foxes";
const QUEST_NAME = "Fox sculptures";

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

    await StandaloneChatPage();
    await StandaloneChatPage();
    const chat = await privateChat(her.id);

    expect(await listMessages(her.id, chat.id)).toEqual([]);
    expect(await goldSpent(her)).toBe(0);

    await constructReply(chat.id, SAID);
    await StandaloneChatPage();
    expect((await privateChat(her.id)).id).toBe(chat.id);
    const said = await listMessages(her.id, chat.id);
    expect(said.map(({ role }) => role)).toEqual(["user", "assistant"]);

    await signIn(other);
    await StandaloneChatPage();
    const theirs = await privateChat(other.id);
    expect(theirs.id).not.toBe(chat.id);
    expect(await listMessages(other.id, chat.id)).toEqual([]);
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

    const checks = [
      expectRedirect(() => openOld(chat.id), "/chat"),
      expectRedirect(() => openOld(own), `/projects/${ownQuest.id}`),
      expectRedirect(() => openOld(shared), `/projects/${sharedQuest.id}`),
      expectNotFound(() => openOld(foreign)),
      expectNotFound(() => openOld("not-a-chat")),
      expectNotFound(() => openOld(crypto.randomUUID())),
    ];
    await expect(Promise.all(checks)).resolves.toHaveLength(checks.length);
  });

  test("the old new-adventure address opens Chat and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);

    await expectRedirect(() => OldNewChatPage(), "/chat");

    expect(await goldSpent(user)).toBe(0);
  });
});

describe("use_case_project_from_standalone_chat", () => {
  test("confirming a Chat summary starts a quest with only that Journal, and Chat stays private", async () => {
    const { her, other } = await twoUsers();
    const chat = await privateChat(her.id);
    await constructReply(chat.id, SAID);
    const edited = `${chatSummaryDraft(await listMessages(her.id, chat.id))}\nStart small.`;

    const starting = startQuestAction(
      { kind: "idle" },
      formOf({
        premadeId: "do",
        name: QUEST_NAME,
        journal: edited,
        constructId: "vellum",
      }),
    );
    await Promise.allSettled([starting]);
    const quest = (await listProjects(her.id)).find(
      ({ name }) => name === QUEST_NAME,
    );
    if (quest === undefined) {
      throw new Error("No quest started");
    }
    await expectRedirect(() => starting, `/projects/${quest.id}`);

    expect((await readMemory(her.id, quest.id)).text).toBe(edited);
    const conversation = await readQuestConversation(her.id, quest.id);
    if (conversation === undefined) {
      throw new Error("The quest has no conversation");
    }
    expect(conversation.id).not.toBe(chat.id);
    const questMessages = await listMessages(her.id, conversation.id);
    expect(JSON.stringify(questMessages)).not.toContain(SAID);
    expect(await listMessages(her.id, chat.id)).toHaveLength(2);

    await addProjectMember(other.id, quest.id);
    await signIn(other);
    expect(await resolveConversation(other.id, chat.id)).toBeUndefined();
    expect(await listMessages(other.id, chat.id)).toEqual([]);
    await expectNotFound(() => openOld(chat.id));
  });
});
