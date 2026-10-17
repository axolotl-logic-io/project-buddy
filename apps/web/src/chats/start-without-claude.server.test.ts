// "use_case_start_without_claude" in use-cases/: starting a project or a
// chat while Claude can't write its opening saves nothing, and the form's
// state keeps her choices. The mock tutor fails an opening whose prompt holds
// `/mock-error <type>` (mock-opening.ts), which a project's name puts there.
// What the forms show is new-chat-form.test.tsx's and
// new-project-form-unavailable.test.tsx's.
import { describe, expect, test } from "vitest";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { formOf } from "@/chats/chat-server-test-kit.ts";
import { listChats } from "@/chats/store.ts";
import { listProjects } from "@/projects/store.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import { signIn } from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";

describe("use_case_start_without_claude", () => {
  test("a new project says Claude is unavailable, keeps her name and buddy, and saves nothing", async () => {
    const user = await testUser();
    const name = `Fox ${crypto.randomUUID()} /mock-error overloaded_error`;
    await signIn(user);

    const state = await createProjectAction(
      { kind: "idle" },
      formOf({ name, buddyId: "mr-tee" }),
    );

    expect(state).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name,
      buddyId: "mr-tee",
    });
    expect(await listProjects(user.id)).toEqual([]);
  });

  test("a new chat says Claude is unavailable, keeps her project and buddy, and saves nothing", async () => {
    const user = await testUser();
    const project = await testData(user).project(
      `Fox ${crypto.randomUUID()} /mock-error billing_error`,
    );
    await signIn(user);

    const state = await startChatAction(
      { kind: "idle" },
      formOf({ projectId: project.id, buddyId: "mr-tee" }),
    );

    expect(state).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: project.id,
      buddyId: "mr-tee",
    });
    expect(await listChats(user.id, project.id)).toEqual([]);
  });
});
