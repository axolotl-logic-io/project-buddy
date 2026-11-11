// Quests' and Chat's continuing conversations, in the test database with
// the mock construct: one per quest and one private Chat per user, found or
// made atomically, never made by reading, open to the quest's people or to
// the Chat's user alone, and the user's one Dailies quest, reused by its
// mark whatever its name.
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { resolveConversation } from "@/conversations/resolve.ts";
import {
  readQuestConversation,
  startProject,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { readMemory, saveMemory } from "@/memory/memory-store.ts";
import {
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import {
  addProjectMember,
  removeProjectMember,
} from "@/projects/members-store.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { listProjects, renameProject } from "@/projects/store.ts";
import { CONVERSATION_WINDOW } from "@/replies/conversation-to-answer.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructReply,
  messageText,
  sendChatMessage,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

// How many requests start one conversation at once in the races below.
const AT_ONCE = 4;

// What a new Dailies starts with, as its premade quest gives it.
function dailiesStart(): Parameters<typeof startDailies>[1] {
  return {
    name: PROJECT_NAME.parse("Dailies"),
    journal: "## Goal\n\nStart each day with one manageable step.",
    construct: getConstruct("vellum"),
    activity: builtInActivity(DEFAULT_ACTIVITY_ID),
  };
}

// The user's Dailies quests.
async function dailiesOf(user: User): Promise<string[]> {
  return (await listProjects(user.id))
    .filter(({ dailies }) => dailies)
    .map(({ id }) => id);
}

describe("a quest's conversation", () => {
  test("reading a quest without one starts none and spends nothing", async () => {
    const user = await testUser();
    const project = await testData(user).project();

    expect(await readQuestConversation(user.id, project.id)).toBeUndefined();
    expect(await readQuestConversation(user.id, project.id)).toBeUndefined();
    expect(await goldSpent(user)).toBe(0);
  });

  test("concurrent starts reach one conversation with one opening", async () => {
    const user = await testUser();
    const project = await testData(user).project();

    const results = await Promise.all(
      Array.from({ length: AT_ONCE }, () =>
        startQuestConversation(user.id, project.id),
      ),
    );

    const ids = new Set(
      results.map((result) => {
        if (result.kind !== "started") {
          throw new Error(`A start was refused: ${result.kind}`);
        }
        return result.conversation.id;
      }),
    );
    expect(ids.size).toBe(1);
    const [id] = ids;
    if (id === undefined) {
      throw new Error("No conversation");
    }
    const opened = await listMessages(user.id, id);
    expect(opened.map(({ role }) => role)).toEqual(["assistant"]);
    expect((await readQuestConversation(user.id, project.id))?.id).toBe(id);
  });

  test("a new quest opens in its one conversation, which every later start continues", async () => {
    const user = await testUser();
    const started = await startProject(
      user.id,
      PROJECT_NAME.parse("Sea turtle"),
      getConstruct("lumen"),
    );
    if (started.kind !== "started") {
      throw new Error(`The quest didn't start: ${started.kind}`);
    }
    const { chat } = started;

    const again = await startQuestConversation(user.id, chat.project.id);

    expect(again).toMatchObject({
      kind: "started",
      conversation: { id: chat.id, construct: { name: "Lumen" } },
    });
    expect(await listMessages(user.id, chat.id)).toHaveLength(1);
  });

  test("another user's quest is not found, and nothing is started in it", async () => {
    const { her, herData, other } = await twoUsers();
    const project = await herData.project();

    expect(await startQuestConversation(other.id, project.id)).toEqual({
      kind: "notFound",
    });
    expect(await readQuestConversation(her.id, project.id)).toBeUndefined();
  });

  test("an owner and a member each write and pay for their own messages, and a removed member loses the conversation", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const data = testData(owner);
    const project = await data.project();
    const chat = await data.chat(project);
    expect(await addProjectMember(member.id, project.id)).toBe(true);

    await signIn(member);
    const sent = await sendChatMessage(chat.id, "Hello from the member");
    expect(sent.status).toBe(HTTP_STATUS.ok);

    const saved = await listMessages(owner.id, chat.id);
    expect(saved[0]?.metadata?.author?.id).toBe(member.id);
    expect(messageText(saved[0])).toBe("Hello from the member");
    expect(await goldSpent(member)).toBeGreaterThan(0);
    expect(await goldSpent(owner)).toBe(0);

    await removeProjectMember(owner.id, project.id, member.id);

    expect(await readQuestConversation(member.id, project.id)).toBeUndefined();
    expect(await getChat(member.id, chat.id)).toBeUndefined();
    expect(await resolveConversation(member.id, chat.id)).toBeUndefined();
    expect(await resolveConversation(owner.id, chat.id)).toEqual({
      kind: "quest",
      projectId: project.id,
    });
  });
});

describe("a quest's Progress", () => {
  test("a milestone stays on the timeline, with no conversation, once its conversation is gone", async () => {
    const user = await testUser();
    const data = testData(user);
    const project = await data.project();
    const chat = await data.chat(project);
    await recordMilestone(
      user.id,
      { projectId: project.id, chatId: chat.id },
      "Modelled the shell",
    );

    await getDb().delete(chats).where(eq(chats.id, chat.id));

    expect(await listMilestones(user.id, project.id)).toMatchObject([
      { text: "Modelled the shell", chatId: undefined },
    ]);
  });
});

describe("a long conversation", () => {
  test("a reply reads only the newest messages, while the conversation keeps them all", async () => {
    const user = await testUser();
    const data = testData(user);
    const chat = await data.chat(await data.project());
    const reply: Exchange["reply"] = [{ type: "text", text: "Ok" }];
    const exchanges: Exchange[] = [
      { message: "The first thing: oldkeyword", reply },
      ...Array.from({ length: CONVERSATION_WINDOW }, () => ({
        message: "Carry on",
        reply,
      })),
      { message: "The latest thing: newkeyword", reply },
    ];
    await data.exchanges(chat, exchanges);
    await signIn(user);

    const recalled = await constructReply(chat.id, "/mock-recall oldkeyword");
    const recent = await constructReply(chat.id, "/mock-recall newkeyword");

    expect(messageText(recalled)).toContain("recalls nothing");
    expect(messageText(recent)).toContain("The latest thing: newkeyword");
    expect(messageText((await listMessages(user.id, chat.id))[0])).toContain(
      "oldkeyword",
    );
  });
});

describe("the private Chat", () => {
  test("its user returns to the same conversation, which no one else can reach", async () => {
    const { her, other } = await twoUsers();

    const [first, second] = await Promise.all([
      privateChat(her.id),
      privateChat(her.id),
    ]);
    const later = await privateChat(her.id);
    const theirs = await privateChat(other.id);

    expect(second.id).toBe(first.id);
    expect(later.id).toBe(first.id);
    expect(first.project).toBeUndefined();
    expect(await listMessages(her.id, first.id)).toEqual([]);
    expect(await goldSpent(her)).toBe(0);
    expect(theirs.id).not.toBe(first.id);
    expect(await getChat(other.id, first.id)).toBeUndefined();
    expect(await resolveConversation(other.id, first.id)).toBeUndefined();
    expect(await resolveConversation(her.id, first.id)).toEqual({
      kind: "chat",
    });
  });
});

describe("Dailies", () => {
  test("concurrent starts make one Dailies quest, and each start after resumes it", async () => {
    const user = await testUser();

    const results = await Promise.all(
      Array.from({ length: AT_ONCE }, () =>
        startDailies(user.id, dailiesStart()),
      ),
    );

    const quests = await dailiesOf(user);
    expect(quests).toHaveLength(1);
    expect(
      results.map((result) => {
        if (result.kind !== "started" && result.kind !== "resumed") {
          throw new Error(`Dailies didn't start: ${result.kind}`);
        }
        return result.chat.project.id;
      }),
    ).toEqual(Array.from({ length: AT_ONCE }, () => quests[0]));
    expect(results.filter(({ kind }) => kind === "started")).toHaveLength(1);
  });

  test("resuming keeps its conversation, Journal and name, whatever it is renamed to", async () => {
    const user = await testUser();
    const first = await startDailies(user.id, dailiesStart());
    if (first.kind !== "started") {
      throw new Error(`Dailies didn't start: ${first.kind}`);
    }
    const { chat } = first;
    await signIn(user);
    await sendChatMessage(chat.id, "Let's start the day.");
    const journal = await readMemory(user.id, chat.project.id);
    await saveMemory(user.id, {
      projectId: chat.project.id,
      text: `${journal.text}\n\n- Walked the dog`,
      basedOn: MEMORY_VERSION_NUMBER.parse(journal.version),
      author: "user",
    });
    await renameProject(
      user.id,
      chat.project.id,
      PROJECT_NAME.parse("Mornings"),
    );
    const before = await listMessages(user.id, chat.id);
    const spent = await goldSpent(user);

    const resumed = await startDailies(user.id, dailiesStart());

    expect(resumed).toMatchObject({
      kind: "resumed",
      chat: { id: chat.id, project: { id: chat.project.id, name: "Mornings" } },
    });
    expect(await listMessages(user.id, chat.id)).toEqual(before);
    expect((await readMemory(user.id, chat.project.id)).text).toContain(
      "Walked the dog",
    );
    expect(await goldSpent(user)).toBe(spent);
  });

  test("each user has their own Dailies, and a member's start makes theirs", async () => {
    const { her, other } = await twoUsers();
    const hers = await startDailies(her.id, dailiesStart());
    if (hers.kind !== "started") {
      throw new Error(`Dailies didn't start: ${hers.kind}`);
    }
    expect(await addProjectMember(other.id, hers.chat.project.id)).toBe(true);

    const theirs = await startDailies(other.id, dailiesStart());

    expect(theirs.kind).toBe("started");
    expect(await dailiesOf(other)).toHaveLength(1);
    expect(await dailiesOf(other)).not.toContain(hers.chat.project.id);
    expect(await dailiesOf(her)).toEqual([hers.chat.project.id]);
  });
});
