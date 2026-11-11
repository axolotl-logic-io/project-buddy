// Quests' and Chat's continuing conversations, in the test database with
// the mock construct: one per quest and one private Chat per user, found or
// made atomically, never made by reading, open to the quest's people or to
// the Chat's user alone, and the user's one Dailies quest, reused by its
// mark whatever its name.
import { eq } from "drizzle-orm";
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startTheDay } from "@/conversations/dailies.ts";
import {
  type PremadeQuestStart,
  startPremadeQuest,
} from "@/conversations/premade-quest.ts";
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
import type { ProjectId } from "@/ids.ts";
import { readMemory } from "@/memory/memory-store.ts";
import {
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import { changePlanAction } from "@/plan/plan-actions.ts";
import { readPlan } from "@/plan/plan-store.ts";
import {
  addProjectMember,
  removeProjectMember,
} from "@/projects/members-store.ts";
import type { PremadeId } from "@/projects/premade.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { listProjects, renameProject } from "@/projects/store.ts";
import { CONVERSATION_WINDOW } from "@/replies/conversation-to-answer.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import {
  constructReply,
  messageText,
  postMessage,
  question,
  sendChatMessage,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

// How many requests start one conversation at once in the races below.
const AT_ONCE = 4;

// What a premade quest starts with, as the catalog gives it.
function premadeStart(premade: PremadeId): PremadeQuestStart {
  return {
    premade,
    name: PROJECT_NAME.parse("Dailies"),
    journal: "## Goal\n\nOne manageable step.",
    construct: getConstruct("vellum"),
    activity: builtInActivity(DEFAULT_ACTIVITY_ID),
  };
}

// Starts the user's day in their Dailies with text, and has the construct
// reply to it through the chat API, as the browser asks for it.
async function startDay(
  user: User,
  projectId: ProjectId,
  text: string,
): Promise<void> {
  const message = question(text);
  const started = await startTheDay(user.id, projectId, message);
  if (started.kind !== "started" || started.messageId !== message.id) {
    throw new Error("The day didn't start with her message");
  }
  const response = await postMessage(user, started.chat, message);
  await response.text();
  await afterTasksDone();
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

describe("premade quests", () => {
  test("Learn, Make and Do start a new quest for each goal, each with its own conversation", async () => {
    const user = await testUser();

    const goals: readonly PremadeId[] = ["learn", "learn", "make", "do"];
    const started = await Promise.all(
      goals.map((premade, at) =>
        startPremadeQuest(user.id, {
          ...premadeStart(premade),
          name: PROJECT_NAME.parse(`Goal ${at}`),
        }),
      ),
    );

    const conversations = started.map((result) => {
      if (result.kind !== "started") {
        throw new Error(`The quest didn't start: ${result.kind}`);
      }
      return result.chat;
    });
    expect(new Set(conversations.map(({ project }) => project.id)).size).toBe(
      goals.length,
    );
    expect(new Set(conversations.map(({ id }) => id)).size).toBe(goals.length);
    const quests = await listProjects(user.id);
    expect(quests).toHaveLength(goals.length);
    expect(quests.some(({ dailies }) => dailies)).toBe(false);
  });

  test("choosing, previewing or cancelling saves nothing and spends nothing", async () => {
    const user = await testUser();

    // The start form calls nothing until the user confirms: only reads.
    expect(await listProjects(user.id)).toEqual([]);
    expect(await dailiesOf(user)).toEqual([]);
    expect(await goldSpent(user)).toBe(0);
  });
});

describe("Dailies", () => {
  test("concurrent starts make one Dailies quest, and each start after resumes it", async () => {
    const user = await testUser();

    const results = await Promise.all(
      Array.from({ length: AT_ONCE }, () =>
        startPremadeQuest(user.id, premadeStart("dailies")),
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

  test("each day continues its conversation, keeping every earlier day, its Journal, plan and name", async () => {
    const user = await testUser();
    const first = await startPremadeQuest(user.id, premadeStart("dailies"));
    if (first.kind !== "started") {
      throw new Error(`Dailies didn't start: ${first.kind}`);
    }
    const { chat } = first;
    const projectId = chat.project.id;
    await signIn(user);
    await startDay(user, projectId, "Day one: let's start the day.");
    await renameProject(user.id, projectId, PROJECT_NAME.parse("Mornings"));
    await changePlanAction({
      projectId,
      operations: [{ op: "add", text: "Water the plants" }],
    });
    const [journal, plan] = await Promise.all([
      readMemory(user.id, projectId),
      readPlan(user.id, projectId),
    ]);
    const spent = await goldSpent(user);

    const resumed = await startPremadeQuest(user.id, premadeStart("dailies"));
    expect(resumed).toMatchObject({
      kind: "resumed",
      chat: { id: chat.id, project: { id: projectId, name: "Mornings" } },
    });
    expect(await goldSpent(user)).toBe(spent);
    await startDay(user, projectId, "Day two: let's start the day.");

    const texts = (await listMessages(user.id, chat.id)).map(messageText);
    expect(texts.filter((text) => text.startsWith("Day "))).toEqual([
      "Day one: let's start the day.",
      "Day two: let's start the day.",
    ]);
    expect(await readMemory(user.id, projectId)).toEqual(journal);
    expect(await readPlan(user.id, projectId)).toEqual(plan);
  });

  test("starting the day twice at once adds one message, and its reply is charged to her", async () => {
    const user = await testUser();
    const first = await startPremadeQuest(user.id, premadeStart("dailies"));
    if (first.kind !== "started") {
      throw new Error(`Dailies didn't start: ${first.kind}`);
    }
    const projectId = first.chat.project.id;

    const [one, two] = await Promise.all([
      startTheDay(user.id, projectId, question("Let's start the day.")),
      startTheDay(user.id, projectId, question("Let's start the day.")),
    ]);

    expect(one.kind).toBe("started");
    expect(two).toEqual(one);
    const before = await listMessages(user.id, first.chat.id);
    expect(before.map(({ role }) => role)).toEqual(["assistant", "user"]);
    expect(await goldSpent(user)).toBe(0);
  });

  test("each user has their own Dailies; a member can't start the day in another's", async () => {
    const { her, other } = await twoUsers();
    const hers = await startPremadeQuest(her.id, premadeStart("dailies"));
    if (hers.kind !== "started") {
      throw new Error(`Dailies didn't start: ${hers.kind}`);
    }
    expect(await addProjectMember(other.id, hers.chat.project.id)).toBe(true);

    const theirs = await startPremadeQuest(other.id, premadeStart("dailies"));
    const refused = await startTheDay(
      other.id,
      hers.chat.project.id,
      question("Mine now"),
    );

    expect(theirs.kind).toBe("started");
    expect(refused).toEqual({ kind: "notFound" });
    expect(await dailiesOf(other)).toHaveLength(1);
    expect(await dailiesOf(other)).not.toContain(hers.chat.project.id);
    expect(await dailiesOf(her)).toEqual([hers.chat.project.id]);
    expect(await listMessages(her.id, hers.chat.id)).toHaveLength(1);
  });
});
