// Her projects and a new project's first adventure, in the test database
// with the mock construct: the list and a project's chats, as the stores give
// them to the pages, and what the New Project form's action makes.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { cloneConstruct } from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { saveInterviewConstruct } from "@/constructs/interview-construct.ts";
import { readMemory, readMemoryHistory } from "@/memory/memory-store.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  formOf,
  messageText,
} from "../../../test-database/chat-test-kit.ts";
import { expectRedirect } from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

const IDLE: CreateProjectState = { kind: "idle" };

// Creates a project named name, in the construct of constructId when it is given,
// from the New Project form as the signed-in user; finds the project's only
// chat through the stores, checks the action opened that chat, and returns
// it.
async function createProject(
  user: User,
  name: string,
  constructId?: string,
): Promise<ProjectChat> {
  const form = new FormData();
  form.set("name", name);
  if (constructId !== undefined) {
    form.set("constructId", constructId);
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
    const older = await data.chat(project, "vellum");
    const newer = await data.chat(project, "lumen");
    await data.chat(await data.project(), "lumen");

    const listed = await listChats(user.id, project.id);

    expect(listed.map(({ id, construct }) => [id, construct.name])).toEqual([
      [newer.id, getConstruct("lumen").name],
      [older.id, getConstruct("vellum").name],
    ]);
  });
});

describe("use_case_new_project", () => {
  test("the project is made with its first adventure, with Vellum, which opens with a question", async () => {
    const user = await testUser();
    await signIn(user);
    const name = `New project ${crypto.randomUUID()}`;

    const chat = await createProject(user, `  ${name}  `);

    expect(
      (await listProjects(user.id)).map((project) => project.name),
    ).toEqual([name]);
    expect(await listChats(user.id, chat.project.id)).toEqual([chat]);
    expect(chat.construct.name).toBe(getConstruct("vellum").name);
    expect((await currentActivity(user.id, chat)).id).toBe("project-breakdown");
    const messages = await listMessages(user.id, chat.id);
    expect(messages.map(({ role }) => role)).toEqual(["assistant"]);
    expect(messages.map(messageText).join("")).toContain("?");
  });
});

describe("use_case_new_project_with_construct", () => {
  test("legacy named callers without a construct use the saved preference", async () => {
    const user = await testUser();
    await signIn(user);
    await saveInterviewConstruct(user.id, "lumen");

    const chat = await createProject(user, "Saved preference quest");

    expect(chat.construct.name).toBe(getConstruct("lumen").name);
    expect((await currentActivity(user.id, chat)).id).toBe("project-breakdown");
  });

  test("the first adventure is with the built-in construct she chose", async () => {
    const user = await testUser();
    await signIn(user);

    const chat = await createProject(user, "Lumen's project", "lumen");

    expect(chat.construct.name).toBe(getConstruct("lumen").name);
  });

  test("the first adventure is with her own construct, when she chose it", async () => {
    const user = await testUser();
    await signIn(user);
    const own = await cloneConstruct(user.id, "lumen");
    if (own === undefined) {
      throw new Error("Lumen could not be cloned");
    }

    const chat = await createProject(user, "Her construct's project", own.id);

    expect(chat.construct.name).toBe(own.name);
    expect((await getChat(user.id, chat.id))?.construct.definition).toEqual(
      own.definition,
    );
  });
});

describe("use_case_new_project_without_name", () => {
  test("a name of only spaces asks for a name at the field, with her choices, and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    const form = new FormData();
    form.set("name", "   ");
    form.set("constructId", "lumen");

    expect(await createProjectAction(IDLE, form)).toEqual({
      kind: "invalidName",
      message: PROJECTS_COPY.needsName,
      name: "   ",
      motivation: "",
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
    form.set("constructId", "lumen");

    expect(await createProjectAction(IDLE, form)).toEqual({
      kind: "invalidName",
      message: PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH),
      name,
      motivation: "",
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

describe("use_case_new_project_motivation", () => {
  test("keeps motivation in shared memory and uses the selected construct rather than the preference", async () => {
    const user = await testUser();
    await signIn(user);
    await saveInterviewConstruct(user.id, "lumen");
    const motivation = "Make a fox as a birthday gift";
    const creating = createProjectAction(
      IDLE,
      formOf({
        name: "Gift",
        motivation: `  ${motivation}  `,
        constructId: "vellum",
      }),
    );
    await Promise.allSettled([creating]);
    const [project] = await listProjects(user.id);
    if (project === undefined) {
      throw new Error("No quest was made");
    }
    const [chat] = await listChats(user.id, project.id);
    if (chat === undefined) {
      throw new Error("No chat was made");
    }
    await expectRedirect(() => creating, `/chats/${chat.id}`);
    expect(chat.construct.name).toBe("Vellum");
    expect((await readMemory(user.id, project.id)).text).toBe(motivation);
    expect(await readMemoryHistory(user.id, project.id)).toMatchObject([
      { author: "user", text: motivation },
    ]);
    expect(
      (await listMessages(user.id, chat.id)).map(messageText).join("\n"),
    ).toContain(motivation);
    expect(await constructPrompt(chat.id)).toContain(motivation);
    await saveInterviewConstruct(user.id, "vellum");
    expect((await getChat(user.id, chat.id))?.construct.name).toBe("Vellum");
  });
});

describe("use_case_start_quest_two_fields", () => {
  test("omitting a name creates a valid quest in the default activity with the selected construct", async () => {
    const user = await testUser();
    await signIn(user);
    const creating = createProjectAction(
      IDLE,
      formOf({ constructId: "lumen", motivation: "" }),
    );
    await Promise.allSettled([creating]);
    const [project] = await listProjects(user.id);
    if (project === undefined) {
      throw new Error("No quest was made");
    }
    const [chat] = await listChats(user.id, project.id);
    if (chat === undefined) {
      throw new Error("No adventure was made");
    }
    await expectRedirect(() => creating, `/chats/${chat.id}`);
    expect(project.name).toBe(PROJECTS_COPY.defaultName);
    expect(chat.construct.name).toBe("Lumen");
    expect((await currentActivity(user.id, chat)).id).toBe("project-breakdown");
    const later = await testData(user).chat(project, "vellum");
    expect(later.construct.name).toBe("Vellum");
  });
  test("another user's construct cannot start a quest", async () => {
    const user = await testUser();
    const other = await testUser();
    const own = await cloneConstruct(other.id, "lumen");
    if (own === undefined) {
      throw new Error("No construct was cloned");
    }
    await signIn(user);
    expect(
      await createProjectAction(IDLE, formOf({ constructId: own.id })),
    ).toMatchObject({ kind: "invalid" });
    expect(await listProjects(user.id)).toEqual([]);
  });
});
