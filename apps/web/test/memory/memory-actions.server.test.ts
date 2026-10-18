// Her edits to a project's memory, from the memory page's forms, in the
// test database with the mock tutor: what each save or restore keeps as a
// version, and what the project's chats then work from.
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { readMemory, readMemoryHistory } from "@/memory/memory-store.ts";
import { tutorEdits, tutorPrompt } from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import {
  restoreFromHistory,
  saveFromEditor,
} from "../test-database/memory-form-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

// The version a restore over the tutor's two saves makes.
const RESTORED_VERSION = 3;

// A chat in a new project of a new user's, who is signed in.
async function signedInChat(): Promise<{ user: User; chat: Chat }> {
  const user = await testUser();
  const data = testData(user);
  const chat = await data.chat(await data.project());
  await signIn(user);
  return { user, chat };
}

describe("use_case_edit_memory", () => {
  test("saving it unchanged adds no version", async () => {
    const { user, chat } = await signedInChat();
    await tutorEdits(chat.id, "", "- Next: texture");
    const shown = await readMemory(user.id, chat.projectId);

    expect(
      await saveFromEditor(chat.projectId, shown.text, shown.version),
    ).toEqual({ kind: "saved" });

    expect(await readMemoryHistory(user.id, chat.projectId)).toHaveLength(1);
  });

  test("her save is the newest version, and the chat works from it", async () => {
    const { user, chat } = await signedInChat();
    await tutorEdits(chat.id, "", "- Next: texture");
    const { version } = await readMemory(user.id, chat.projectId);

    expect(
      await saveFromEditor(chat.projectId, "- Next: rigging", version),
    ).toEqual({ kind: "saved" });

    const history = await readMemoryHistory(user.id, chat.projectId);
    expect(history.map(({ author }) => author)).toEqual(["user", "tutor"]);
    expect((await readMemory(user.id, chat.projectId)).text).toBe(
      "- Next: rigging",
    );
    expect(await tutorPrompt(chat.id)).toContain("- Next: rigging");
  });
});

describe("use_case_undo_memory_change", () => {
  test("restoring a version adds it as the newest, and every version stays", async () => {
    const { user, chat } = await signedInChat();
    await tutorEdits(chat.id, "", "- right");
    await tutorEdits(chat.id, "right", "wrong");
    const [newest, earlier] = await readMemoryHistory(user.id, chat.projectId);
    if (newest === undefined || earlier === undefined) {
      throw new Error("The tutor didn't save both versions");
    }

    expect(
      await restoreFromHistory(chat.projectId, earlier.version, newest.version),
    ).toEqual({ kind: "saved" });

    const history = await readMemoryHistory(user.id, chat.projectId);
    expect(history.map(({ version, author }) => [version, author])).toEqual([
      [RESTORED_VERSION, "user"],
      [newest.version, "tutor"],
      [earlier.version, "tutor"],
    ]);
    expect(history[0]?.text).toBe(earlier.text);
    expect(history[1]?.text).toBe(newest.text);
  });
});

describe("use_case_memory_edit_conflict", () => {
  test("a save over a newer version by the tutor is refused and saves nothing", async () => {
    const { user, chat } = await signedInChat();
    const shown = await readMemory(user.id, chat.projectId);
    await tutorEdits(chat.id, "", "- the tutor's");

    expect(
      await saveFromEditor(chat.projectId, "- hers", shown.version),
    ).toEqual({ kind: "outdated" });

    const history = await readMemoryHistory(user.id, chat.projectId);
    expect(history.map(({ author }) => author)).toEqual(["tutor"]);
    expect(history.map(({ text }) => text).join("\n")).not.toContain("hers");
    expect((await readMemory(user.id, chat.projectId)).text).toContain(
      "the tutor's",
    );
  });
});
