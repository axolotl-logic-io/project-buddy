// Her edits to a project's memory, from the memory page's forms, in the
// test database with the mock tutor: what each save or restore keeps as a
// version, and what the project's chats then work from.
import { describe, expect, test, vi } from "vitest";
import {
  editMemory,
  readMemory,
  readMemoryHistory,
} from "@/memory/memory-store.ts";
import { signedInChat } from "../test-database/chat-test-kit.ts";
import {
  restoreFromHistory,
  saveFromEditor,
} from "../test-database/memory-form-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";

const NEWEST_VERSION = 2;
const MISSING_VERSION = 99;

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

// The version a restore over the tutor's two saves makes.
const RESTORED_VERSION = 3;

describe("use_case_edit_memory", () => {
  test("saving it unchanged adds no version", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.projectId,
      edit: { oldText: "", newText: "- Next: texture" },
      author: "tutor",
    });
    const shown = await readMemory(user.id, chat.projectId);

    expect(
      await saveFromEditor(chat.projectId, shown.text, shown.version),
    ).toEqual({ kind: "saved" });

    expect(await readMemoryHistory(user.id, chat.projectId)).toHaveLength(1);
  });

  test("her save is the newest version", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.projectId,
      edit: { oldText: "", newText: "- Next: texture" },
      author: "tutor",
    });
    const { version } = await readMemory(user.id, chat.projectId);

    expect(
      await saveFromEditor(chat.projectId, "- Next: rigging", version),
    ).toEqual({ kind: "saved" });

    const history = await readMemoryHistory(user.id, chat.projectId);
    expect(history.map(({ author }) => author)).toEqual(["user", "tutor"]);
    expect((await readMemory(user.id, chat.projectId)).text).toBe(
      "- Next: rigging",
    );
  });
});

describe("use_case_undo_memory_change", () => {
  test("restoring a version adds it as the newest, and every version stays", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.projectId,
      edit: { oldText: "", newText: "- right" },
      author: "tutor",
    });
    await editMemory(user.id, {
      projectId: chat.projectId,
      edit: { oldText: "right", newText: "wrong" },
      author: "tutor",
    });
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
    await editMemory(user.id, {
      projectId: chat.projectId,
      edit: { oldText: "", newText: "- the tutor's" },
      author: "tutor",
    });

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

test("memory editor accepts and normalizes an uppercase project ID", async () => {
  const { user, chat } = await signedInChat();
  const result = await saveFromEditor(
    chat.projectId.toUpperCase(),
    "Canonical project\r\nSecond line",
    0,
  );
  expect(result).toMatchObject({ kind: "saved" });
  expect((await readMemory(user.id, chat.projectId)).text).toBe(
    "Canonical project\nSecond line",
  );
});

describe("Memory restore refusals", () => {
  test("a stale restore adds no version and a missing version is not found", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.projectId,
      edit: { oldText: "", newText: "First" },
      author: "tutor",
    });
    await editMemory(user.id, {
      projectId: chat.projectId,
      edit: { oldText: "First", newText: "Second" },
      author: "tutor",
    });
    const before = await readMemoryHistory(user.id, chat.projectId);
    expect(await restoreFromHistory(chat.projectId, 1, 1)).toEqual({
      kind: "outdated",
    });
    expect(await readMemoryHistory(user.id, chat.projectId)).toEqual(before);
    await expectNotFound(() =>
      restoreFromHistory(chat.projectId, MISSING_VERSION, NEWEST_VERSION),
    );
    expect(await readMemoryHistory(user.id, chat.projectId)).toEqual(before);
  });
  test("an edit whose old text is missing adds no version", async () => {
    const { user, chat } = await signedInChat();
    await saveFromEditor(chat.projectId, "Kept", 0);
    const before = await readMemoryHistory(user.id, chat.projectId);
    expect(
      await editMemory(user.id, {
        projectId: chat.projectId,
        edit: { oldText: "Missing", newText: "Wrong" },
        author: "tutor",
      }),
    ).toMatchObject({ kind: "failed", reason: "missing" });
    expect(await readMemoryHistory(user.id, chat.projectId)).toEqual(before);
  });
});
