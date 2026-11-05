// Starting a new project from the new-chat form, in the test database with
// the mock construct: the project and its interview chat are made with the
// chosen construct, and a missing or too long name makes nothing.
import { describe, expect, test } from "vitest";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { NEW_PROJECT } from "@/chats/new-chat-selection.ts";
import { listChats } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { saveInterviewConstruct } from "@/constructs/interview-construct.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

describe("use_case_new_project_from_new_chat", () => {
  test("a named new project is made with its interview chat, in the chosen construct, and opens", async () => {
    const user = await testUser();
    await signIn(user);
    await saveInterviewConstruct(user.id, "lumen");
    const name = `New chat project ${crypto.randomUUID()}`;

    const starting = startChatAction(
      { kind: "idle" },
      formOf({
        projectId: NEW_PROJECT,
        activityId: INTERVIEW_ACTIVITY_ID,
        constructId: "vellum",
        motivation: "Learn to build something useful",
        name: `  ${name}  `,
      }),
    );
    await Promise.allSettled([starting]);
    const [project] = await listProjects(user.id);
    if (project === undefined) {
      throw new Error("No project was made");
    }
    const [chat] = await listChats(user.id, project.id);
    if (chat === undefined) {
      throw new Error("The project has no chat");
    }
    await expectRedirect(() => starting, `/chats/${chat.id}`);

    expect(project.name).toBe(name);
    expect((await readMemory(user.id, project.id)).text).toBe(
      "Learn to build something useful",
    );
    expect(chat.construct.name).toBe(getConstruct("lumen").name);
    expect((await currentActivity(user.id, chat)).id).toBe(
      INTERVIEW_ACTIVITY_ID,
    );
  });

  test("a new project without a name asks for one, keeps her choices, and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    await saveInterviewConstruct(user.id, "lumen");

    expect(
      await startChatAction(
        { kind: "idle" },
        formOf({
          projectId: NEW_PROJECT,
          activityId: INTERVIEW_ACTIVITY_ID,
          constructId: "lumen",
          name: "   ",
        }),
      ),
    ).toEqual({
      kind: "invalidProjectName",
      message: NEW_CHAT_COPY.needsProjectName,
      projectId: NEW_PROJECT,
      activityId: INTERVIEW_ACTIVITY_ID,
      constructId: "lumen",
      name: "   ",
      motivation: "",
    });
    expect(await listProjects(user.id)).toEqual([]);
  });
});

describe("use_case_new_project_name_too_long", () => {
  test("a new project's name longer than the limit asks for a shorter one, keeps her choices, and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);
    await saveInterviewConstruct(user.id, "lumen");
    const name = "f".repeat(PROJECT_NAME_MAX_LENGTH + 1);

    expect(
      await startChatAction(
        { kind: "idle" },
        formOf({
          projectId: NEW_PROJECT,
          activityId: INTERVIEW_ACTIVITY_ID,
          constructId: "lumen",
          name,
        }),
      ),
    ).toEqual({
      kind: "invalidProjectName",
      message: NEW_CHAT_COPY.projectNameTooLong(PROJECT_NAME_MAX_LENGTH),
      projectId: NEW_PROJECT,
      activityId: INTERVIEW_ACTIVITY_ID,
      constructId: "lumen",
      name,
      motivation: "",
    });
    expect(await listProjects(user.id)).toEqual([]);
  });
});
