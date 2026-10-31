// Every chat in a project works from its one memory, in the test database
// with the mock buddy: a chat with another buddy reads and changes the same
// memory, and the next reply in any chat uses the memory as it is now.

import { describe, expect, test, vi } from "vitest";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import { getBuddy } from "@/buddies/index.ts";
import { startChat } from "@/chats/start-chat.ts";
import { getChat, listChats } from "@/chats/store.ts";
import { editMemory, readMemory } from "@/memory/memory-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { buddyEdits, buddyPrompt } from "../test-database/chat-test-kit.ts";
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

describe("use_case_switch_buddy", () => {
  test("a chat with another buddy opens with the same memory, and its change reaches the first chat", async () => {
    const user = await testUser();
    const data = testData(user);
    const project = await data.project();
    const hippyChat = await data.chat(project, "hippy");
    await signIn(user);
    await buddyEdits(hippyChat.id, "", `- Next: ${MILESTONE}`);

    const started = await startChat(user.id, {
      project,
      buddy: getBuddy("mr-tee"),
      activity: builtInActivity(DEFAULT_ACTIVITY_ID),
    });
    if (started.kind !== "started") {
      throw new Error(`The chat didn't start: ${started.kind}`);
    }
    const mrTeeChat = started.chat;
    expect(await buddyPrompt(mrTeeChat.id)).toContain(MILESTONE);
    await buddyEdits(mrTeeChat.id, MILESTONE, CHANGED);

    const [chats, hippyChatNow] = await Promise.all([
      listChats(user.id, project.id),
      getChat(user.id, hippyChat.id),
    ]);
    expect(chats.map(({ id }) => id)).toEqual([mrTeeChat.id, hippyChat.id]);
    expect(hippyChatNow?.buddy.name).toBe(getBuddy("hippy").name);
    const prompt = await buddyPrompt(hippyChat.id);
    expect(prompt).toContain(CHANGED);
    expect(prompt).not.toContain(MILESTONE);
  });
});

describe("use_case_ask_whats_next", () => {
  test("a chat answers from the memory, and its next reply uses her change", async () => {
    const user = await testUser();
    const data = testData(user);
    const project = await data.project();
    const [laterChat] = await Promise.all([
      data.chat(project, "hippy"),
      signIn(user),
    ]);
    await editMemory(user.id, {
      projectId: project.id,
      edit: {
        oldText: "",
        newText: `## Milestones\n\n- [ ] ${MILESTONE}\n- [ ] ${CHANGED}`,
      },
      author: "buddy",
    });

    expect(await buddyPrompt(laterChat.id)).toContain(`- [ ] ${MILESTONE}`);

    const { version } = await readMemory(user.id, project.id);
    expect(
      await saveFromEditor(
        project.id,
        `## Milestones\n\n- [x] ${MILESTONE}\n- [ ] ${CHANGED}`,
        version,
      ),
    ).toEqual({ kind: "saved" });
    expect(await buddyPrompt(laterChat.id)).toContain(`- [x] ${MILESTONE}`);
  });
});
