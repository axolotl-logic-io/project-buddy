import { describe, expect, test } from "vitest";
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
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { question, userWithChat } from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const buddy = getBuddy("hippy");

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
    const chatsBefore = await listChats(user.id, chat.projectId);
    await expect(
      createProjectWithChat(user.id, "Must roll back", { buddy, opening }),
    ).rejects.toHaveProperty("errorCase");
    expect(await listProjects(user.id)).toEqual(before);
    await expect(
      createChatWithOpening(
        user.id,
        { projectId: chat.projectId, buddy },
        opening,
      ),
    ).rejects.toHaveProperty("errorCase");
    expect(await listChats(user.id, chat.projectId)).toEqual(chatsBefore);
    expect(await listMessages(user.id, chat.id)).toEqual([opening]);
    expect(log).toHaveBeenCalledTimes(2);
  });
  test("a foreign project refuses both chat starts and saves nothing", async () => {
    const [owner, other] = await Promise.all([testUser(), testUser()]);
    const project = await testData(owner).project();
    const opening = { ...question("Opening"), role: "assistant" as const };
    const log = spyOnErrorLog();
    await expect(
      createChat(other.id, { projectId: project.id, buddy }),
    ).rejects.toHaveProperty("errorCase", "not-found");
    await expect(
      createChatWithOpening(
        other.id,
        { projectId: project.id, buddy },
        opening,
      ),
    ).rejects.toHaveProperty("errorCase", "not-found");
    expect(await listChats(owner.id, project.id)).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });
});
