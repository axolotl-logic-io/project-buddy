import { describe, expect, test, vi } from "vitest";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { NOTE_ID, NOTE_MAX_LENGTH } from "@/notes/note.ts";
import { listNoteQuestsAction, saveNoteAction } from "@/notes/note-actions.ts";
import { editNote, listNotes, saveNote } from "@/notes/note-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { commandNotes, runCommand } from "../commands/command-test-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "../quests/quest-members-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

describe("use_case_quick_note", () => {
  test("a Quick Note is saved to an Active quest, listed newest first and deleted with /drop-note", async () => {
    const user = await testUser();
    const data = testData(user);
    const quest = await data.quest("Pottery");
    const chat = await data.chat(quest);
    await signIn(user);

    expect(await listNoteQuestsAction()).toEqual([
      { id: quest.id, name: "Pottery", sharing: { kind: "personal" } },
    ]);
    expect(
      await saveNoteAction({
        questId: quest.id,
        text: "  Try a slower wheel ",
      }),
    ).toMatchObject({ kind: "saved" });
    const saved = await saveNoteAction({
      questId: quest.id,
      text: "Buy more clay",
    });
    const notesAfterSave = await listNotes(user.id, quest.id);
    expect(saved).toEqual({ kind: "saved", notes: notesAfterSave });
    const notes = await listNotes(user.id, quest.id);
    expect(notes.map((note) => note.text)).toEqual([
      "Buy more clay",
      "Try a slower wheel",
    ]);

    expect(await runCommand(chat.id, PANEL_COMMAND.dropNote(1))).toMatchObject({
      kind: "noted",
      note: PANEL_COMMANDS_COPY.notes.dropNote("Buy more clay"),
    });
    expect(await runCommand(chat.id, PANEL_COMMAND.dropNote(2))).toEqual({
      kind: "problem",
      text: PANEL_COMMANDS_COPY.problems.noNote(1),
    });
    expect(
      (await listNotes(user.id, quest.id)).map((note) => note.text),
    ).toEqual(["Try a slower wheel"]);
    expect(await commandNotes(user.id, chat.id)).toEqual([
      {
        command: PANEL_COMMAND.dropNote(1),
        note: PANEL_COMMANDS_COPY.notes.dropNote("Buy more clay"),
      },
    ]);
  });

  test("editing preserves line breaks, saved dates and experience and validates text", async () => {
    const user = await testUser();
    const data = testData(user);
    const quest = await data.quest();
    const chat = await data.chat(quest);
    await signIn(user);
    await saveNoteAction({ questId: quest.id, text: "Original" });
    const before = await listNotes(user.id, quest.id);
    const experience = await readExperience(user.id);
    const text = "First paragraph\n\nSecond paragraph";
    expect(
      await runCommand(chat.id, PANEL_COMMAND.editNote(1, `  ${text}  `)),
    ).toMatchObject({ kind: "noted" });
    expect(await listNotes(user.id, quest.id)).toEqual(
      before.map((note) => ({ ...note, text })),
    );
    expect(await readExperience(user.id)).toEqual(experience);
    expect(await commandNotes(user.id, chat.id)).toEqual([
      {
        command: PANEL_COMMAND.editNote(1, `  ${text}`),
        note: PANEL_COMMANDS_COPY.notes.editNote(1, text),
      },
    ]);
    const refused = await Promise.all(
      ["", "a".repeat(NOTE_MAX_LENGTH + 1)].map((invalid) =>
        runCommand(chat.id, PANEL_COMMAND.editNote(1, invalid)),
      ),
    );
    expect(refused).toEqual([
      { kind: "problem", text: QUICK_NOTE_COPY.problem("empty") },
      { kind: "problem", text: QUICK_NOTE_COPY.problem("too-long") },
    ]);
    expect((await listNotes(user.id, quest.id))[0]?.text).toBe(text);
    expect(
      await runCommand(chat.id, PANEL_COMMAND.editNote(2, "Missing")),
    ).toMatchObject({ kind: "problem" });
  });

  test("only the owner and accepted members can edit a note", async () => {
    const [owner, member, pending, removed, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
      testUser(),
      testUser(),
    ]);
    const data = testData(owner);
    const [quest, otherQuest] = await Promise.all([data.quest(), data.quest()]);
    await signIn(owner);
    await saveNoteAction({ questId: quest.id, text: "Original" });
    const [note] = await listNotes(owner.id, quest.id);
    if (note === undefined) {
      throw new Error("The saved note is missing");
    }
    await addMember(owner, quest.id, member);
    await addInvitee(owner, quest.id, pending);
    await addRemovedMember(owner, quest.id, removed);
    const denied = await Promise.all(
      [pending, removed, stranger].map((user) =>
        editNote(user.id, { questId: quest.id, id: note.id, text: "Denied" }),
      ),
    );
    expect(denied).toEqual([false, false, false]);
    expect(
      await editNote(owner.id, {
        questId: otherQuest.id,
        id: note.id,
        text: "Wrong quest",
      }),
    ).toBe(false);
    expect(
      await editNote(owner.id, {
        questId: quest.id,
        id: NOTE_ID.parse("55555555-5555-4555-8555-555555555555"),
        text: "Missing",
      }),
    ).toBe(false);
    expect(
      await editNote(owner.id, {
        questId: quest.id,
        id: note.id,
        text: "Owner",
      }),
    ).toBe(true);
    expect(
      await editNote(member.id, {
        questId: quest.id,
        id: note.id,
        text: "Member",
      }),
    ).toBe(true);
    expect((await listNotes(owner.id, quest.id))[0]?.text).toBe("Member");
  });

  test("only owners and accepted members can create, with multiline text and server dates", async () => {
    const [owner, member, pending, removed, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
      testUser(),
      testUser(),
    ]);
    const quest = await testData(owner).quest();
    await addMember(owner, quest.id, member);
    await addInvitee(owner, quest.id, pending);
    await addRemovedMember(owner, quest.id, removed);
    const refused = await Promise.all(
      [pending, removed, stranger].map((user) =>
        saveNote(user.id, { questId: quest.id, text: "Denied" }),
      ),
    );
    expect(refused).toEqual([false, false, false]);
    await signIn(member);
    const result = await saveNoteAction({
      questId: quest.id,
      text: "  Clay\n\nGlaze  ",
    });
    const notes = await listNotes(owner.id, quest.id);
    expect(result).toEqual({ kind: "saved", notes });
    expect(notes).toHaveLength(1);
    expect(notes[0]?.text).toBe("Clay\n\nGlaze");
    expect(notes[0]?.savedAt).toBeInstanceOf(Date);
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
    ).toMatchObject({ kind: "saved" });
    expect(await saveNoteAction({ questId: "nope", text: "Hi" })).toEqual({
      kind: "problem",
      text: QUICK_NOTE_COPY.invalid,
    });
    expect(await listNotes(user.id, quest.id)).toHaveLength(1);
  });

  test.each(["completed", "abandoned"] as const)(
    "a %s quest takes no new Quick Note but keeps its notes",
    async (status) => {
      const user = await testUser();
      const data = testData(user);
      const quest = await data.quest("Finished");
      const chat = await data.chat(quest);
      await signIn(user);
      await saveNoteAction({ questId: quest.id, text: "Kept" });
      await changeQuestStatus(user.id, {
        questId: quest.id,
        fromStatus: "active",
        toStatus: status,
        revision: 0,
      });

      expect(await listNoteQuestsAction()).toEqual([]);
      expect(await saveNoteAction({ questId: quest.id, text: "Late" })).toEqual(
        {
          kind: "problem",
          text: QUICK_NOTE_COPY.notFound,
        },
      );
      const [kept] = await listNotes(user.id, quest.id);
      expect(kept?.text).toBe("Kept");
      expect(
        await runCommand(chat.id, PANEL_COMMAND.editNote(1, "Edited later")),
      ).toMatchObject({ kind: "noted" });
      expect(
        await runCommand(chat.id, PANEL_COMMAND.dropNote(1)),
      ).toMatchObject({
        kind: "noted",
      });
      expect(await listNotes(user.id, quest.id)).toEqual([]);
    },
  );

  test("another user can neither save to, list nor delete a quest's Quick Notes", async () => {
    const owner = await testUser();
    const ownerData = testData(owner);
    const quest = await ownerData.quest();
    const chat = await ownerData.chat(quest);
    await signIn(owner);
    await saveNoteAction({ questId: quest.id, text: "Private" });

    const stranger = await testUser();
    await signIn(stranger);
    expect(await listNoteQuestsAction()).toEqual([]);
    expect(await listNotes(stranger.id, quest.id)).toEqual([]);
    expect(await saveNoteAction({ questId: quest.id, text: "Mine" })).toEqual({
      kind: "problem",
      text: QUICK_NOTE_COPY.notFound,
    });
    expect(await runCommand(chat.id, PANEL_COMMAND.dropNote(1))).toEqual({
      kind: "not-found",
    });

    expect(
      (await listNotes(owner.id, quest.id)).map((saved) => saved.text),
    ).toEqual(["Private"]);
  });
});
