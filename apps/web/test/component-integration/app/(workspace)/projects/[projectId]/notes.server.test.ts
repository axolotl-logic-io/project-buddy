// A project's notes on its page, in the test database: the page lists the
// newest, and "use_case_delete_note" takes one out of the memory as a
// version by the user, leaving the rest of the memory as it was. What the
// list does in the browser is project-notes.browser.test.tsx's.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { editMemory, readMemoryHistory } from "@/memory/memory-store.ts";
import { dayOf, NOTE_MAX_LENGTH } from "@/notes/note.ts";
import { RECENT_NOTES, readRecentNotes } from "@/notes/note-store.ts";
import { PROJECT_NOTES_COPY } from "@/ui/copy/notes.ts";
import { signedInChat } from "../../../../test-database/chat-test-kit.ts";
import {
  deleteFromNotes,
  saveFromQuickCapture,
} from "../../../../test-database/note-form-test-kit.ts";
import { twoUsers } from "../../../../test-database/two-users-test-kit.ts";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

const TODAY = dayOf(new Date(), "utc");

// The project's page, as the signed-in user sees it.
async function pageHtml(projectId: string): Promise<string> {
  return renderToStaticMarkup(
    await ProjectPage({
      params: Promise.resolve({ projectId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

test("the project's page lists its newest notes, newest first", async () => {
  const { user, chat } = await signedInChat();
  const html = await pageHtml(chat.project.id);
  expect(html).toContain(PROJECT_NOTES_COPY.none);

  const texts = Array.from(
    { length: RECENT_NOTES + 1 },
    (_, index) => `note ${index}`,
  );
  await editMemory(user.id, {
    projectId: chat.project.id,
    edit: {
      oldText: "",
      newText: texts.map((text) => `Note (${TODAY}): ${text}`).join("\n\n"),
    },
    author: "user",
  });

  const shown = await pageHtml(chat.project.id);
  const listed = texts.filter((text) => shown.includes(`>${text}<`));
  expect(listed).toEqual(texts.slice(1));
  expect(shown.indexOf(">note 10<")).toBeLessThan(shown.indexOf(">note 1<"));
  expect(shown).toContain(`/capture?projectId=${chat.project.id}`);
});

describe("use_case_delete_note", () => {
  test("deleting a note takes it out of the memory as the user's version, and the rest stays", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "", newText: "# Goal" },
      author: "construct",
    });
    await saveFromQuickCapture(chat.project.id, "keep me", TODAY);
    await saveFromQuickCapture(chat.project.id, "delete me", TODAY);

    expect(
      await deleteFromNotes(chat.project.id, { day: TODAY, text: "delete me" }),
    ).toEqual({ kind: "deleted" });

    const history = await readMemoryHistory(user.id, chat.project.id);
    expect(history.map(({ author }) => author)).toEqual([
      "user",
      "user",
      "user",
      "construct",
    ]);
    expect(history[0]?.text).toBe(`# Goal\n\nNote (${TODAY}): keep me`);
    expect(await readRecentNotes(user.id, chat.project.id)).toEqual([
      { day: TODAY, text: "keep me" },
    ]);
  });

  test("deleting a note that is gone already changes nothing, and says so", async () => {
    const { user, chat } = await signedInChat();
    await saveFromQuickCapture(chat.project.id, "once", TODAY);
    const note = { day: TODAY, text: "once" };
    await deleteFromNotes(chat.project.id, note);

    expect(await deleteFromNotes(chat.project.id, note)).toEqual({
      kind: "missing",
      message: PROJECT_NOTES_COPY.missing,
    });
    expect(await readMemoryHistory(user.id, chat.project.id)).toHaveLength(2);
  });

  test("every listed note can be deleted, however it was spaced or however long", async () => {
    const { user, chat } = await signedInChat();
    const spaced = "try  a   cage";
    const long = "x".repeat(NOTE_MAX_LENGTH + 1);
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: {
        oldText: "",
        newText: `# Goal\n\nNote (${TODAY}): ${spaced}\n\nNote (${TODAY}): ${long}`,
      },
      author: "construct",
    });
    const listed = await readRecentNotes(user.id, chat.project.id);
    expect(listed.map(({ text }) => text)).toEqual([long, spaced]);
    const [longNote, spacedNote] = listed;
    if (longNote === undefined || spacedNote === undefined) {
      throw new Error("The page doesn't list both notes");
    }

    expect(await deleteFromNotes(chat.project.id, longNote)).toEqual({
      kind: "deleted",
    });
    expect(await deleteFromNotes(chat.project.id, spacedNote)).toEqual({
      kind: "deleted",
    });

    expect(await readRecentNotes(user.id, chat.project.id)).toEqual([]);
    const [newest] = await readMemoryHistory(user.id, chat.project.id);
    expect(newest?.text).toBe("# Goal");
  });

  test("another user's note can't be deleted", async () => {
    const { other, otherData } = await twoUsers();
    const foreign = await otherData.project("Private den");
    await editMemory(other.id, {
      projectId: foreign.id,
      edit: { oldText: "", newText: `Note (${TODAY}): private` },
      author: "user",
    });

    expect(
      await deleteFromNotes(foreign.id, { day: TODAY, text: "private" }),
    ).toMatchObject({ kind: "missing" });

    expect(await readRecentNotes(other.id, foreign.id)).toEqual([
      { day: TODAY, text: "private" },
    ]);
  });
});
