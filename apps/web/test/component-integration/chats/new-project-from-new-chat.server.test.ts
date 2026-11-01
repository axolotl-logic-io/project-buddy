// Starting a new project from the new-chat form, in the test database with
// the mock buddy: the project and its interview chat are made with the
// chosen buddy, and a missing name makes nothing.
import { describe, expect, test } from "vitest";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { getBuddy } from "@/buddies/index.ts";
import { NEW_PROJECT } from "@/chats/new-chat-selection.ts";
import { listChats } from "@/chats/store.ts";
import { listProjects } from "@/projects/store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

describe("use_case_new_project_from_new_chat", () => {
  test("a named new project is made with its interview chat, in the chosen buddy, and opens", async () => {
    const user = await testUser();
    await signIn(user);
    const name = `New chat project ${crypto.randomUUID()}`;

    const starting = startChatAction(
      { kind: "idle" },
      formOf({
        projectId: NEW_PROJECT,
        activityId: INTERVIEW_ACTIVITY_ID,
        buddyId: "mr-tee",
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
    expect(chat.buddy.name).toBe(getBuddy("mr-tee").name);
    expect((await currentActivity(user.id, chat)).id).toBe(
      INTERVIEW_ACTIVITY_ID,
    );
  });

  test("a new project without a name asks for one, keeps her choices, and makes nothing", async () => {
    const user = await testUser();
    await signIn(user);

    expect(
      await startChatAction(
        { kind: "idle" },
        formOf({
          projectId: NEW_PROJECT,
          activityId: INTERVIEW_ACTIVITY_ID,
          buddyId: "mr-tee",
          name: "   ",
        }),
      ),
    ).toEqual({
      kind: "needsProjectName",
      message: NEW_CHAT_COPY.needsProjectName,
      projectId: NEW_PROJECT,
      activityId: INTERVIEW_ACTIVITY_ID,
      buddyId: "mr-tee",
      name: "   ",
    });
    expect(await listProjects(user.id)).toEqual([]);
  });
});
