// "use_case_quick_note": quick capture's save, in the test database with the
// mock buddy. A note is added to the end of the project's memory, dated, as
// a version by the user, and the project's next reply works from it. What
// the form shows in the browser is quick-capture-form.browser.test.tsx's.
import { describe, expect, test, vi } from "vitest";
import { editMemory, readMemoryHistory } from "@/memory/memory-store.ts";
import { dayOf, NOTE_MAX_LENGTH } from "@/notes/note.ts";
import { readRecentNotes } from "@/notes/note-store.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import {
  buddyPrompt,
  signedInChat,
} from "../../../test-database/chat-test-kit.ts";
import { saveFromQuickCapture } from "../../../test-database/note-form-test-kit.ts";
import { twoUsers } from "../../../test-database/two-users-test-kit.ts";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

const NOTE = "try a subdivision cage on the shell";
// The day the browser sends: the test's own, which the action accepts.
const TODAY = dayOf(new Date(), "utc");

describe("use_case_quick_note", () => {
  test("a note is saved, dated, at the end of the memory as the user's version, and the next reply knows it", async () => {
    const { user, chat } = await signedInChat();
    await editMemory(user.id, {
      projectId: chat.project.id,
      edit: { oldText: "", newText: "# Goal\n\nA sea turtle" },
      author: "buddy",
    });

    expect(
      await saveFromQuickCapture(chat.project.id, `  ${NOTE}\n`, TODAY),
    ).toEqual({ kind: "saved", projectName: chat.project.name });

    const [history, notes, usage] = await Promise.all([
      readMemoryHistory(user.id, chat.project.id),
      readRecentNotes(user.id, chat.project.id),
      readMonthlyUsage(user.id, new Date()),
    ]);
    expect(history.map(({ author }) => author)).toEqual(["user", "buddy"]);
    expect(history[0]?.text).toBe(
      `# Goal\n\nA sea turtle\n\nNote (${TODAY}): ${NOTE}`,
    );
    expect(notes).toEqual([{ day: TODAY, text: NOTE }]);
    expect(usage.spentMicroUsd, "saving a note calls no model").toBe(0);
    expect(await buddyPrompt(chat.id)).toContain(`Note (${TODAY}): ${NOTE}`);
  });

  test("an empty note is refused and saves nothing", async () => {
    const { user, chat } = await signedInChat();

    expect(await saveFromQuickCapture(chat.project.id, " \n ", TODAY)).toEqual({
      kind: "invalid",
      message: QUICK_CAPTURE_COPY.empty,
    });
    expect(
      await saveFromQuickCapture(
        chat.project.id,
        "x".repeat(NOTE_MAX_LENGTH + 1),
        TODAY,
      ),
    ).toEqual({ kind: "invalid", message: QUICK_CAPTURE_COPY.tooLong });

    expect(await readMemoryHistory(user.id, chat.project.id)).toEqual([]);
  });

  test("a note to another user's project fails and saves nothing there", async () => {
    const { otherData, other } = await twoUsers();
    const foreign = await otherData.project("Private den");

    expect(await saveFromQuickCapture(foreign.id, NOTE, TODAY)).toMatchObject({
      kind: "failed",
    });
    expect(await readMemoryHistory(other.id, foreign.id)).toEqual([]);
  });
});
