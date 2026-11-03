// Her projects and a new project's interview chat, in the test database
// with the mock buddy: the list and a project's chats, as the stores give
// them to the pages, and what the New Project form's action makes.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { cloneBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { messageText } from "../../../test-database/chat-test-kit.ts";
import { expectRedirect } from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

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
    expect((await currentActivity(user.id, chat)).id).toBe(
      INTERVIEW_ACTIVITY_ID,
    );
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

describe("use_case_new_project_without_name", () => {
  test("a name of only spaces asks for a name at the field, with her choices, and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    const form = new FormData();
    form.set("name", "   ");
    form.set("buddyId", "mr-tee");

    expect(await createProjectAction(IDLE, form)).toEqual({
      kind: "invalidName",
      message: PROJECTS_COPY.needsName,
      name: "   ",
      buddyId: "mr-tee",
    });
    expect(await listProjects(user.id)).toEqual([]);
  });
});

describe("use_case_new_project_name_too_long", () => {
  test("a name longer than the limit is refused at the field, with her choices, and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "Fox ".repeat(PROJECT_NAME_MAX_LENGTH);
    const form = new FormData();
    form.set("name", name);
    form.set("buddyId", "mr-tee");

    expect(await createProjectAction(IDLE, form)).toEqual({
      kind: "invalidName",
      message: PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH),
      name,
      buddyId: "mr-tee",
    });
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a name of exactly the limit, once trimmed, is made", async () => {
    const user = await testUser();
    await signIn(user);
    const name = "f".repeat(PROJECT_NAME_MAX_LENGTH);

    const chat = await createProject(user, `  ${name}  `);

    expect(chat.project.name).toBe(name);
  });

  test("the limit counts UTF-16 code units, as the name field does, so a fox emoji counts as 2", async () => {
    const user = await testUser();
    await signIn(user);
    const atLimit = "🦊".repeat(PROJECT_NAME_MAX_LENGTH / 2);
    const overLimit = `${atLimit}🦊`;
    const form = new FormData();
    form.set("name", overLimit);

    expect(await createProjectAction(IDLE, form)).toMatchObject({
      kind: "invalidName",
      message: PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH),
    });
    expect(await listProjects(user.id)).toEqual([]);

    const chat = await createProject(user, atLimit);

    expect(chat.project.name).toBe(atLimit);
  });
});
