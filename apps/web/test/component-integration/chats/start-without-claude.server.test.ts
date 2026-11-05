// "use_case_start_without_claude" in use-cases/: starting a project or a
// chat while Claude can't write its opening saves nothing, and the form's
// state keeps the user's choices. Only a construct or an activity of the user's
// own that has been edited has no prepared opening, so these start with an
// edited construct. The mock construct fails an opening whose prompt holds
// `/mock-error <type>` (mock-opening.ts), which a project's name puts there.
// What the forms show is new-chat-form.test.tsx's and
// new-project-form-unavailable.test.tsx's.
import { describe, expect, test } from "vitest";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { listChats } from "@/chats/store.ts";
import { listProjects } from "@/projects/store.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

describe("use_case_start_without_claude", () => {
  test("a new project says Claude is unavailable, keeps her name and construct, and saves nothing", async () => {
    const user = await testUser();
    const name = `Fox ${crypto.randomUUID()} /mock-error overloaded_error`;
    const [construct] = await Promise.all([
      testData(user).editedConstruct(),
      signIn(user),
    ]);

    const state = await createProjectAction(
      { kind: "idle" },
      formOf({ name, constructId: construct.id }),
    );

    expect(state).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name,
      constructId: construct.id,
    });
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a new chat says Claude is unavailable, keeps her project and construct, and saves nothing", async () => {
    const user = await testUser();
    const data = testData(user);
    const [project, construct] = await Promise.all([
      data.project(`Fox ${crypto.randomUUID()} /mock-error billing_error`),
      data.editedConstruct(),
      signIn(user),
    ]);

    const state = await startChatAction(
      { kind: "idle" },
      formOf({ projectId: project.id, constructId: construct.id }),
    );

    expect(state).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: project.id,
      activityId: "open-chat",
      constructId: construct.id,
      name: "",
    });
    expect(await listChats(user.id, project.id)).toEqual([]);
  });
});
