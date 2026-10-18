// "use_case_over_quota" in use-cases/: the month's Claude quota used up. Her
// spend starts a micro-USD below the quota, so the mock tutor's first reply,
// charged at Sonnet's prices like Claude's, crosses it. Next month's spend is
// topped up to the quota after that reply, so a run that crosses a UTC
// month's end between the reply and her next message still finds the quota
// used up. The chat's text going back into the box is the chat view's to
// show (chat-view-quota-refusal.test.tsx).
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
import { HTTP_STATUS } from "@/http-status.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { readChatFailure } from "@/tutor/chat-protocol.ts";
import { mockChatName } from "@/tutor/mock-chat-name.ts";
import { quotaUsedUpMessage } from "@/ui/copy/chat.ts";
import {
  messageText,
  type SentMessage,
  sendChatMessage,
} from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import {
  quotaMessage,
  spend,
  spendInMonthAfter,
} from "../test-database/spend-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

// Her first message in each test's chat.
const FIRST_MESSAGE = "Bevel a donut";
const SECOND_MESSAGE = "Now add sprinkles";
// The messages the chat has after her first message and its reply.
const AFTER_FIRST_EXCHANGE = 2;
// The first and last lines of the mock tutor's reply to her first message
// (mock-script.ts): a reply holding both was saved in full.
const REPLY_OPENING = `This is the mock tutor. You said: "${FIRST_MESSAGE}".`;
const ENDS_WITH_CODE_BLOCK =
  /\n```python\nimport bpy\nbpy\.ops\.mesh\.bevel\(offset=0\.1\)\n```$/u;

// A chat of user's in a new project, with them signed in.
interface QuotaScene {
  readonly user: User;
  readonly project: Project;
  readonly chat: Chat;
  // When the scene's spend was seeded.
  readonly since: Date;
}

// A scene whose user has spent microUsd this month.
async function sceneWithSpend(microUsd: number): Promise<QuotaScene> {
  const user = await testUser();
  const data = testData(user);
  const project = await data.project();
  const chat = await data.chat(project, "mr-tee");
  const since = new Date();
  await spend(user, microUsd);
  await signIn(user);
  return { user, project, chat, since };
}

// What a refused message's answer says: its status, and the quota message
// the chat shows for it, or the body itself if it isn't a quota refusal
// with its reset.
function quotaRefusal({
  status,
  body,
}: SentMessage): Pick<SentMessage, "status" | "body"> {
  const failure = readChatFailure(new Error(body));
  if (failure.errorCase !== "quota-used-up" || failure.resetsOn === undefined) {
    return { status, body };
  }
  return { status, body: quotaUsedUpMessage(failure.resetsOn) };
}

// What sending her first message, which crosses the quota, did: the answer's
// status, the roles of the chat's messages, the reply's text and the
// chat's name.
interface CrossingReply {
  readonly status: number;
  readonly roles: readonly string[];
  readonly reply: string;
  readonly name: string | undefined;
}

// Sends her first message, which crosses the quota, then tops up next
// month's spend to the quota, and says what the message did.
async function sendCrossingMessage({
  user,
  chat,
}: QuotaScene): Promise<CrossingReply> {
  const beforeFirst = new Date();
  const { status } = await sendChatMessage(chat.id, FIRST_MESSAGE);
  const saved = await listMessages(user.id, chat.id);
  const [reply = ""] = saved
    .filter(({ role }) => role === "assistant")
    .map(messageText);
  const name = (await getChat(user.id, chat.id))?.name;
  // The reply was charged in beforeFirst's month or, if it has ended, the
  // next, seeded a micro-USD below the quota. Topping the next up to the
  // quota means a month's end before her next message still finds it used
  // up.
  await spendInMonthAfter(user, 1, beforeFirst);
  return { status, roles: saved.map(({ role }) => role), reply, name };
}

// The message a start-chat or create-project form shows for state, or its
// kind if it is no quota refusal.
function refusalMessage(state: StartChatState | CreateProjectState): string {
  if (state.kind === "quotaUsedUp") {
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
}: QuotaScene): Promise<StartAttempts> {
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

test("use_case_over_quota", async () => {
  const scene = await sceneWithSpend(MONTHLY_QUOTA_MICRO_USD - 1);
  const { user, chat, project, since } = scene;

  const crossing = await sendCrossingMessage(scene);
  expect(crossing.status).toBe(HTTP_STATUS.ok);
  expect(crossing.roles).toStrictEqual(["user", "assistant"]);
  expect(crossing.reply).toContain(REPLY_OPENING);
  expect(crossing.reply).toMatch(ENDS_WITH_CODE_BLOCK);
  expect(crossing.name).toBe(mockChatName(FIRST_MESSAGE, AFTER_FIRST_EXCHANGE));

  const afterFirst = await listMessages(user.id, chat.id);
  const next = quotaRefusal(await sendChatMessage(chat.id, SECOND_MESSAGE));
  expect(next.status).toBe(HTTP_STATUS.tooManyRequests);
  expect(next.body).toMatch(quotaMessage(since));
  expect(await listMessages(user.id, chat.id)).toStrictEqual(afterFirst);

  const attempts = await tryToStart(scene);
  expect(attempts.newChat).toMatch(quotaMessage(since));
  expect(attempts.newProject).toMatch(quotaMessage(since));
  expect(attempts.chatCount).toBe(1);
  expect(attempts.projectIds).toStrictEqual([project.id]);
});

describe("use_case_over_quota", () => {
  test("an empty chat's refused first message leaves it empty, with no reply", async () => {
    const { user, chat, since } = await sceneWithSpend(MONTHLY_QUOTA_MICRO_USD);

    const refused = quotaRefusal(await sendChatMessage(chat.id, FIRST_MESSAGE));

    expect(refused.status).toBe(HTTP_STATUS.tooManyRequests);
    expect(refused.body).toMatch(quotaMessage(since));
    expect(await listMessages(user.id, chat.id)).toStrictEqual([]);
  });
});
