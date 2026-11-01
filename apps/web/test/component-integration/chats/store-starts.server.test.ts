import { describe, expect, test } from "vitest";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { getBuddy } from "@/buddies/index.ts";
import {
  createChat,
  createChatWithOpening,
  createProjectWithChat,
} from "@/chats/new-chat-store.ts";
import {
  getChat,
  listChats,
  listMessages,
  saveMessage,
  saveReply,
} from "@/chats/store.ts";
import { listProjects } from "@/projects/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { question, userWithChat } from "../test-database/chat-test-kit.ts";

const buddy = getBuddy("hippy");
const activity = builtInActivity(DEFAULT_ACTIVITY_ID);

test("a reply lists immediately after the message it answers, before a later message", async () => {
  const { user, chat } = await userWithChat();
  const first = question("First");
  const second = question("Second");
  await saveMessage(user.id, chat.id, first);
  await saveMessage(user.id, chat.id, second);
  const reply = { ...question("Reply"), role: "assistant" as const };
  await saveReply(user.id, chat.id, reply, first.id);
  expect((await listMessages(user.id, chat.id)).map(({ id }) => id)).toEqual([
    first.id,
    reply.id,
    second.id,
  ]);
});

test("an uppercase chat ID finds the saved chat", async () => {
  const { user, chat } = await userWithChat();
  expect(await getChat(user.id, chat.id.toUpperCase())).toMatchObject(chat);
});

describe("new-chat transaction rollback", () => {
  test("a duplicate opening leaves neither a new project nor a new chat", async () => {
    const log = spyOnErrorLog();
    const { user, chat } = await userWithChat();
    const opening = { ...question("Opening"), role: "assistant" as const };
    await saveMessage(user.id, chat.id, opening);
    const before = await listProjects(user.id);
    const chatsBefore = await listChats(user.id, chat.project.id);
    await expect(
      createProjectWithChat(user.id, "Must roll back", {
        buddy,
        activity,
        opening,
      }),
    ).rejects.toHaveProperty("errorCase");
    expect(await listProjects(user.id)).toEqual(before);
    await expect(
      createChatWithOpening(
        user.id,
        { project: chat.project, buddy, activity },
        opening,
      ),
    ).rejects.toHaveProperty("errorCase");
    expect(await listChats(user.id, chat.project.id)).toEqual(chatsBefore);
    expect(await listMessages(user.id, chat.id)).toEqual([opening]);
    expect(log).toHaveBeenCalledTimes(2);
  });
  test("a foreign project refuses both chat starts and saves nothing", async () => {
    const [owner, other] = await Promise.all([testUser(), testUser()]);
    const project = await testData(owner).project();
    const opening = { ...question("Opening"), role: "assistant" as const };
    const log = spyOnErrorLog();
    await expect(
      createChat(other.id, { project, buddy }),
    ).rejects.toHaveProperty("errorCase", "not-found");
    await expect(
      createChatWithOpening(other.id, { project, buddy, activity }, opening),
    ).rejects.toHaveProperty("errorCase", "not-found");
    expect(await listChats(owner.id, project.id)).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });
});
