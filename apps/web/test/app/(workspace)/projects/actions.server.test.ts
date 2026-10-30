// Her projects and a new project's interview chat, in the test database
// with the mock buddy: the list and a project's chats, as the stores give
// them to the pages, and what the New Project form's action makes.
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { cloneBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { getProject, listProjects } from "@/projects/store.ts";
import { messageText } from "../../../test-database/chat-test-kit.ts";
import { testData } from "../../../test-database/data-test-kit.ts";
import { expectRedirect } from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";
import { testUser } from "../../../test-database/user-test-kit.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// Creates a project named name, in the buddy of buddyId when it is given,
// from the New Project form as the signed-in user; finds the project's only
// chat through the stores, checks the action opened that chat, and returns
// it.
async function createProject(
  user: User,
  name: string,
  buddyId?: string,
): Promise<ProjectChat> {
  const form = new FormData();
  form.set("name", name);
  if (buddyId !== undefined) {
    form.set("buddyId", buddyId);
  }
  const creating = createProjectAction(IDLE, form);
  await Promise.allSettled([creating]);
  const project = (await listProjects(user.id)).find(
    (made) => made.name === name.trim(),
  );
  if (project === undefined) {
    throw new Error(`No project ${name} was made`);
  }
  const [chat] = await listChats(user.id, project.id);
  if (chat === undefined) {
    throw new Error(`The project ${name} has no chat`);
  }
  await expectRedirect(() => creating, `/chats/${chat.id}`);
  return chat;
}

describe("use_case_view_projects", () => {
  test("her projects are listed newest first", async () => {
    const user = await testUser();
    const data = testData(user);
    const older = await data.project();
    const newer = await data.project();

    expect((await listProjects(user.id)).map(({ id }) => id)).toEqual([
      newer.id,
      older.id,
    ]);
  });
});

describe("use_case_open_project", () => {
  test("a project's chats are listed newest first, and only its own", async () => {
    const user = await testUser();
    const data = testData(user);
    const project = await data.project();
    const older = await data.chat(project, "hippy");
    const newer = await data.chat(project, "mr-tee");
    await data.chat(await data.project(), "argon-sprangler");

    const listed = await listChats(user.id, project.id);

    expect(listed.map(({ id, buddy }) => [id, buddy.name])).toEqual([
      [newer.id, getBuddy("mr-tee").name],
      [older.id, getBuddy("hippy").name],
    ]);
  });
});

describe("use_case_new_project", () => {
  test("the project is made with its interview chat, with Hippy, which opens with a question", async () => {
    const user = await testUser();
    await signIn(user);
    const name = `New project ${crypto.randomUUID()}`;

    const chat = await createProject(user, `  ${name}  `);

    expect(
      (await listProjects(user.id)).map((project) => project.name),
    ).toEqual([name]);
    expect(await listChats(user.id, chat.project.id)).toEqual([chat]);
    expect(chat.buddy.name).toBe(getBuddy("hippy").name);
    expect(await getChat(user.id, chat.id)).toMatchObject({
      isInterviewChat: true,
    });
    expect(await getProject(user.id, chat.project.id)).toMatchObject({
      interviewChatId: chat.id,
    });
    const messages = await listMessages(user.id, chat.id);
    expect(messages.map(({ role }) => role)).toEqual(["assistant"]);
    expect(messages.map(messageText).join("")).toContain("?");
  });
});

describe("use_case_new_project_with_buddy", () => {
  test("the interview chat is with the built-in buddy she chose", async () => {
    const user = await testUser();
    await signIn(user);

    const chat = await createProject(user, "Mr. Tee's project", "mr-tee");

    expect(chat.buddy.name).toBe(getBuddy("mr-tee").name);
  });

  test("the interview chat is with her own buddy, when she chose it", async () => {
    const user = await testUser();
    await signIn(user);
    const own = await cloneBuddy(user.id, "mr-tee");
    if (own === undefined) {
      throw new Error("Mr. Tee could not be cloned");
    }

    const chat = await createProject(user, "Her buddy's project", own.id);

    expect(chat.buddy.name).toBe(own.name);
    expect((await getChat(user.id, chat.id))?.buddy.parts).toEqual(own.parts);
  });
});
