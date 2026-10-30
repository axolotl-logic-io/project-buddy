// Her edits to a project's memory, from the memory page's forms, in the
// test database with the mock buddy: what each save or restore keeps as a
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

// The version a restore over the buddy's two saves makes.
const RESTORED_VERSION = 3;

describe("use_case_edit_memory", () => {
  test("saving it unchanged adds no version", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "", newText: "- Next: texture" },
      author: "buddy",
    });
    const shown = await readMemory(user.id, chat.project.id);

    expect(
      await saveFromEditor(chat.project.id, shown.text, shown.version),
    ).toEqual({ kind: "saved" });

    expect(await readMemoryHistory(user.id, chat.project.id)).toHaveLength(1);
  });

  test("her save is the newest version", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "", newText: "- Next: texture" },
      author: "buddy",
    });
    const { version } = await readMemory(user.id, chat.project.id);

    expect(
      await saveFromEditor(chat.project.id, "- Next: rigging", version),
    ).toEqual({ kind: "saved" });

    const history = await readMemoryHistory(user.id, chat.project.id);
    expect(history.map(({ author }) => author)).toEqual(["user", "buddy"]);
    expect((await readMemory(user.id, chat.project.id)).text).toBe(
      "- Next: rigging",
    );
  });
});

describe("use_case_undo_memory_change", () => {
  test("restoring a version adds it as the newest, and every version stays", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "", newText: "- right" },
      author: "buddy",
    });
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "right", newText: "wrong" },
      author: "buddy",
    });
    const [newest, earlier] = await readMemoryHistory(user.id, chat.project.id);
    if (newest === undefined || earlier === undefined) {
      throw new Error("The buddy didn't save both versions");
    }

    expect(
      await restoreFromHistory(
        chat.project.id,
        earlier.version,
        newest.version,
      ),
    ).toEqual({ kind: "saved" });

    const history = await readMemoryHistory(user.id, chat.project.id);
    expect(history.map(({ version, author }) => [version, author])).toEqual([
      [RESTORED_VERSION, "user"],
      [newest.version, "buddy"],
      [earlier.version, "buddy"],
    ]);
    expect(history[0]?.text).toBe(earlier.text);
    expect(history[1]?.text).toBe(newest.text);
  });
});

describe("use_case_memory_edit_conflict", () => {
  test("a save over a newer version by the buddy is refused and saves nothing", async () => {
    const { user, chat } = await signedInChat();
    const shown = await readMemory(user.id, chat.project.id);
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "", newText: "- the buddy's" },
      author: "buddy",
    });

    expect(
      await saveFromEditor(chat.project.id, "- hers", shown.version),
    ).toEqual({ kind: "outdated" });

    const history = await readMemoryHistory(user.id, chat.project.id);
    expect(history.map(({ author }) => author)).toEqual(["buddy"]);
    expect(history.map(({ text }) => text).join("\n")).not.toContain("hers");
    expect((await readMemory(user.id, chat.project.id)).text).toContain(
      "the buddy's",
    );
  });
});

test("memory editor accepts and normalizes an uppercase project ID", async () => {
  const { user, chat } = await signedInChat();
  const result = await saveFromEditor(
    chat.project.id.toUpperCase(),
    "Canonical project\r\nSecond line",
    0,
  );
  expect(result).toMatchObject({ kind: "saved" });
  expect((await readMemory(user.id, chat.project.id)).text).toBe(
    "Canonical project\nSecond line",
  );
});

describe("Memory restore refusals", () => {
  test("a stale restore adds no version and a missing version is not found", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "", newText: "First" },
      author: "buddy",
    });
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "First", newText: "Second" },
      author: "buddy",
    });
    const before = await readMemoryHistory(user.id, chat.project.id);
    expect(await restoreFromHistory(chat.project.id, 1, 1)).toEqual({
      kind: "outdated",
    });
    expect(await readMemoryHistory(user.id, chat.project.id)).toEqual(before);
    await expectNotFound(() =>
      restoreFromHistory(chat.project.id, MISSING_VERSION, NEWEST_VERSION),
    );
    expect(await readMemoryHistory(user.id, chat.project.id)).toEqual(before);
  });
  test("an edit whose old text is missing adds no version", async () => {
    const { user, chat } = await signedInChat();
    await saveFromEditor(chat.project.id, "Kept", 0);
    const before = await readMemoryHistory(user.id, chat.project.id);
    expect(
      await editMemory(user.id, {
        projectId: chat.project.id,
        edit: { oldText: "Missing", newText: "Wrong" },
        author: "buddy",
      }),
    ).toMatchObject({ kind: "failed", reason: "missing" });
    expect(await readMemoryHistory(user.id, chat.project.id)).toEqual(before);
  });
});
