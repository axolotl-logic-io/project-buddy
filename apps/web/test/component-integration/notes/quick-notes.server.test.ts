import { describe, expect, test, vi } from "vitest";
import { NOTE_MAX_LENGTH } from "@/notes/note.ts";
import {
  deleteNoteAction,
  listNoteQuestsAction,
  saveNoteAction,
} from "@/notes/note-actions.ts";
import { listNotes } from "@/notes/note-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

describe("use_case_quick_note", () => {
  test("a Quick Note is saved to an Active quest, listed newest first and deleted", async () => {
    const user = await testUser();
    const data = testData(user);
    const quest = await data.quest("Pottery");
    await signIn(user);

    expect(await listNoteQuestsAction()).toEqual([
      { id: quest.id, name: "Pottery" },
    ]);
    expect(
      await saveNoteAction({
        questId: quest.id,
        text: "  Try a slower wheel ",
      }),
    ).toEqual({ kind: "saved" });
    expect(
      await saveNoteAction({ questId: quest.id, text: "Buy more clay" }),
    ).toEqual({ kind: "saved" });
    const notes = await listNotes(user.id, quest.id);
    expect(notes.map((note) => note.text)).toEqual([
      "Buy more clay",
      "Try a slower wheel",
    ]);

    expect(
      await deleteNoteAction({ questId: quest.id, id: notes[0]?.id }),
    ).toEqual({ kind: "deleted" });
    expect(
      await deleteNoteAction({ questId: quest.id, id: notes[0]?.id }),
    ).toEqual({ kind: "deleted" });
    expect(
      (await listNotes(user.id, quest.id)).map((note) => note.text),
    ).toEqual(["Try a slower wheel"]);
  });

  test("an empty or overlong Quick Note is refused with its reason", async () => {
    const user = await testUser();
    const quest = await testData(user).quest();
    await signIn(user);

    expect(await saveNoteAction({ questId: quest.id, text: "   " })).toEqual({
      kind: "problem",
      text: QUICK_NOTE_COPY.problem("empty"),
    });
    expect(
      await saveNoteAction({
        questId: quest.id,
        text: "a".repeat(NOTE_MAX_LENGTH + 1),
      }),
    ).toEqual({ kind: "problem", text: QUICK_NOTE_COPY.problem("too-long") });
    expect(
      await saveNoteAction({
        questId: quest.id,
        text: "a".repeat(NOTE_MAX_LENGTH),
      }),
    ).toEqual({ kind: "saved" });
    expect(await saveNoteAction({ questId: "nope", text: "Hi" })).toEqual({
      kind: "problem",
      text: QUICK_NOTE_COPY.invalid,
    });
    expect(await listNotes(user.id, quest.id)).toHaveLength(1);
  });

  test("a Completed quest takes no new Quick Note but keeps its notes", async () => {
    const user = await testUser();
    const quest = await testData(user).quest("Finished");
    await signIn(user);
    await saveNoteAction({ questId: quest.id, text: "Kept" });
    await changeQuestStatus(user.id, {
      questId: quest.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: 0,
    });

    expect(await listNoteQuestsAction()).toEqual([]);
    expect(await saveNoteAction({ questId: quest.id, text: "Late" })).toEqual({
      kind: "problem",
      text: QUICK_NOTE_COPY.notFound,
    });
    const [kept] = await listNotes(user.id, quest.id);
    expect(kept?.text).toBe("Kept");
    await deleteNoteAction({ questId: quest.id, id: kept?.id });
    expect(await listNotes(user.id, quest.id)).toEqual([]);
  });

  test("another user can neither save to, list nor delete a quest's Quick Notes", async () => {
    const owner = await testUser();
    const quest = await testData(owner).quest();
    await signIn(owner);
    await saveNoteAction({ questId: quest.id, text: "Private" });
    const [note] = await listNotes(owner.id, quest.id);

    const stranger = await testUser();
    await signIn(stranger);
    expect(await listNoteQuestsAction()).toEqual([]);
    expect(await listNotes(stranger.id, quest.id)).toEqual([]);
    expect(await saveNoteAction({ questId: quest.id, text: "Mine" })).toEqual({
      kind: "problem",
      text: QUICK_NOTE_COPY.notFound,
    });
    await deleteNoteAction({ questId: quest.id, id: note?.id });

    expect(
      (await listNotes(owner.id, quest.id)).map((saved) => saved.text),
    ).toEqual(["Private"]);
  });
});
