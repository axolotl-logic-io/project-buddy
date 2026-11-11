// A quest's conversation works from its Journal, in the test database with
// the mock construct: the next reply uses the Journal as it is now.

import { describe, expect, test, vi } from "vitest";
import { editMemory, readMemory } from "@/memory/memory-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { constructPrompt } from "../test-database/chat-test-kit.ts";
import { saveFromEditor } from "../test-database/memory-form-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

const MILESTONE = "Model the roof";
const CHANGED = "Texture the walls";

describe("use_case_ask_whats_next", () => {
  test("a chat answers from the memory, and its next reply uses her change", async () => {
    const user = await testUser();
    const data = testData(user);
    const project = await data.project();
    const [laterChat] = await Promise.all([
      data.chat(project, "vellum"),
      signIn(user),
    ]);
    await editMemory(user.id, {
      projectId: project.id,
      edit: {
        oldText: "",
        newText: `## Milestones\n\n- [ ] ${MILESTONE}\n- [ ] ${CHANGED}`,
      },
      author: "construct",
    });

    expect(await constructPrompt(laterChat.id)).toContain(`- [ ] ${MILESTONE}`);

    const { version } = await readMemory(user.id, project.id);
    expect(
      await saveFromEditor(
        project.id,
        `## Milestones\n\n- [x] ${MILESTONE}\n- [ ] ${CHANGED}`,
        version,
      ),
    ).toEqual({ kind: "saved" });
    expect(await constructPrompt(laterChat.id)).toContain(`- [x] ${MILESTONE}`);
  });
});
