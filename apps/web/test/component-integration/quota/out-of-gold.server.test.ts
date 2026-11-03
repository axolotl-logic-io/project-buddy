// "use_case_out_of_gold" in use-cases/: the user's gold spent. Her gold
// starts a micro-USD above 0, so the mock buddy's first reply, charged at
// Sonnet's prices like Claude's, spends the last of it and takes her below
// 0. The chat's text going back into the box is the chat view's to show
// (chat-images.browser.test.tsx).
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { mockChatName } from "@/replies/mock-chat-name.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import {
  spendAllGold,
  spendGold,
} from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  messageText,
  type SentMessage,
  sendChatMessage,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// Her first message in each test's chat.
const FIRST_MESSAGE = "Bevel a donut";
const SECOND_MESSAGE = "Now add sprinkles";
// The messages the chat has after her first message and its reply.
const AFTER_FIRST_EXCHANGE = 2;
// The first and last lines of the mock buddy's reply to her first message
// (mock-script.ts): a reply holding both was saved in full.
const REPLY_OPENING = `This is the mock buddy. You said: "${FIRST_MESSAGE}".`;
const ENDS_WITH_CODE_BLOCK =
  /\n```python\nimport bpy\nbpy\.ops\.mesh\.bevel\(offset=0\.1\)\n```$/u;

// The starting 100 gold, in micro-USD, less one.
const ALL_BUT_ONE_MICRO_USD = 999_999;
const OUT_OF_GOLD: string = userMessage("out-of-gold");

// A chat of user's in a new project, with them signed in.
interface GoldScene {
  readonly user: User;
  readonly project: Project;
  readonly chat: Chat;
}

// A scene whose user has spent their gold as spending does.
async function sceneAfter(
  spending: (user: User) => Promise<void>,
): Promise<GoldScene> {
  const user = await testUser();
  const data = testData(user);
  const project = await data.project();
  const chat = await data.chat(project, "mr-tee");
  await spending(user);
  await signIn(user);
  return { user, project, chat };
}

// Spends all but a micro-USD of user's gold.
function spendAllButOne(user: User): Promise<void> {
  return spendGold(user, ALL_BUT_ONE_MICRO_USD);
}

// What a refused message's answer says: its status, and the message the
// chat shows for its case, or the body itself if it isn't a known case.
function refusal({
  status,
  body,
}: SentMessage): Pick<SentMessage, "status" | "body"> {
  if (body === "out-of-gold") {
    return { status, body: OUT_OF_GOLD };
  }
  return { status, body };
}

// What sending her first message, which spends the last of her gold, did: the answer's
// status, the roles of the chat's messages, the reply's text and the
// chat's name.
interface CrossingReply {
  readonly status: number;
  readonly roles: readonly string[];
  readonly reply: string;
  readonly name: string | undefined;
}

// Sends her first message, which spends the last of her gold, and says
// what it did.
async function sendCrossingMessage({
  user,
  chat,
}: GoldScene): Promise<CrossingReply> {
  const { status } = await sendChatMessage(chat.id, FIRST_MESSAGE);
  const saved = await listMessages(user.id, chat.id);
  const [reply = ""] = saved
    .filter(({ role }) => role === "assistant")
    .map(messageText);
  const name = (await getChat(user.id, chat.id))?.name;
  return { status, roles: saved.map(({ role }) => role), reply, name };
}

// The message a start-chat or create-project form shows for state, or its
// kind if it is no out-of-gold refusal.
function refusalMessage(state: StartChatState | CreateProjectState): string {
  if (state.kind === "outOfGold") {
    return state.message;
  }
  return state.kind;
}

// What starting a chat in the scene's project, and a new project, showed,
// and the scene user's chats and projects after.
interface StartAttempts {
  readonly newChat: string;
  readonly newProject: string;
  readonly chatCount: number;
  readonly projectIds: readonly string[];
}

async function tryToStart({
  user,
  project,
}: GoldScene): Promise<StartAttempts> {
  const newChat = new FormData();
  newChat.set("projectId", project.id);
  newChat.set("buddyId", "mr-tee");
  const newProject = new FormData();
  newProject.set("name", `Fox ${crypto.randomUUID()}`);
  const chatState = await startChatAction({ kind: "idle" }, newChat);
  const projectState = await createProjectAction({ kind: "idle" }, newProject);
  return {
    newChat: refusalMessage(chatState),
    newProject: refusalMessage(projectState),
    chatCount: (await listChats(user.id, project.id)).length,
    projectIds: (await listProjects(user.id)).map(({ id }) => id),
  };
}

test("use_case_out_of_gold", async () => {
  const scene = await sceneAfter(spendAllButOne);
  const { user, chat, project } = scene;

  const crossing = await sendCrossingMessage(scene);
  expect(crossing.status).toBe(HTTP_STATUS.ok);
  expect(crossing.roles).toStrictEqual(["user", "assistant"]);
  expect(crossing.reply).toContain(REPLY_OPENING);
  expect(crossing.reply).toMatch(ENDS_WITH_CODE_BLOCK);
  expect(crossing.name).toBe(mockChatName(FIRST_MESSAGE, AFTER_FIRST_EXCHANGE));

  const afterFirst = await listMessages(user.id, chat.id);
  const next = refusal(await sendChatMessage(chat.id, SECOND_MESSAGE));
  expect(next.status).toBe(HTTP_STATUS.tooManyRequests);
  expect(next.body).toBe(OUT_OF_GOLD);
  expect(await listMessages(user.id, chat.id)).toStrictEqual(afterFirst);

  const attempts = await tryToStart(scene);
  expect(attempts.newChat).toBe(OUT_OF_GOLD);
  expect(attempts.newProject).toBe(OUT_OF_GOLD);
  expect(attempts.chatCount).toBe(1);
  expect(attempts.projectIds).toStrictEqual([project.id]);
});

describe("use_case_out_of_gold", () => {
  test("an empty chat's refused first message leaves it empty, with no reply", async () => {
    const { user, chat } = await sceneAfter(spendAllGold);

    const refused = refusal(await sendChatMessage(chat.id, FIRST_MESSAGE));

    expect(refused.status).toBe(HTTP_STATUS.tooManyRequests);
    expect(refused.body).toBe(OUT_OF_GOLD);
    expect(await listMessages(user.id, chat.id)).toStrictEqual([]);
  });
});
