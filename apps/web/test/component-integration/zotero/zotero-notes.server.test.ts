// Notes on the references of Zotero Collection lists, against the test
// database and the run's fake Zotero (test/support/zotero/fake-zotero.ts):
// reading Zotero's child notes, writing notes here, and sending them with
// Sync, with who in a quest may do what.
import { eq } from "drizzle-orm";
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { plainText } from "@/zotero/works-cited.ts";
import type { ZoteroNoteId } from "@/zotero/zotero.ts";
import {
  discardZoteroChanges,
  saveZoteroNote,
  type ZoteroList,
  type ZoteroReference,
} from "@/zotero/zotero-list-store.ts";
import { syncZoteroList } from "@/zotero/zotero-sync.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  addZoteroNote,
  editZoteroItem,
  editZoteroNote,
  interfereWithZoteroNote,
  zoteroItemNow,
  zoteroNoteWrites,
} from "../../support/zotero/fake-zotero-kit.ts";
import { addInvitee, addMember } from "../quests/quest-members-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";
import {
  bookBib,
  connectZotero,
  fakeZoteroOrigin,
  type ZoteroQuest,
  zoteroListOf,
  zoteroQuest,
} from "./zotero-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const TWO_BOOKS = [
  { bib: bookBib("Austen, Jane", "Emma") },
  { bib: bookBib("Zola, Émile", "Germinal") },
];

// The reference whose entry starts with author.
function referenceBy(zotero: ZoteroList, author: string): ZoteroReference {
  const reference = zotero.references.find(({ entry }) =>
    plainText(entry).startsWith(author),
  );
  if (reference === undefined) {
    throw new Error(`No reference by ${author}`);
  }
  return reference;
}

// Saves user's note on the reference by author: a new one, or the note
// noteId when given.
async function writeNote(
  user: User,
  quest: ZoteroQuest,
  {
    author,
    noteId,
  }: { readonly author: string; readonly noteId?: ZoteroNoteId | undefined },
  text: string,
): ReturnType<typeof saveZoteroNote> {
  const reference = referenceBy(await zoteroListOf(quest.owner, quest), author);
  return saveZoteroNote(
    user.id,
    {
      questId: quest.questId,
      listId: quest.listId,
      referenceId: reference.id,
      noteId,
    },
    text,
  );
}

function sync(quest: ZoteroQuest): ReturnType<typeof syncZoteroList> {
  return syncZoteroList(quest.owner.id, quest.questId, quest.listId);
}

// The notes on the reference by author, as the owner sees them.
async function notesOn(
  quest: ZoteroQuest,
  author: string,
): Promise<ZoteroReference["notes"]> {
  return referenceBy(await zoteroListOf(quest.owner, quest), author).notes;
}

async function named(user: User, name: string): Promise<void> {
  await getDb().update(users).set({ name }).where(eq(users.id, user.id));
}

function noteWrites(quest: ZoteroQuest): ReturnType<typeof zoteroNoteWrites> {
  return zoteroNoteWrites(fakeZoteroOrigin(), quest.account.zoteroUserId);
}

describe("use_case_note_zotero_reference", () => {
  test("a sync reads Zotero's notes, and members' notes wait for the next", async () => {
    const [owner, member, invitee] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
    ]);
    await Promise.all([named(owner, "Autumn"), named(member, "Rowan")]);
    const quest = await zoteroQuest(owner, { items: TWO_BOOKS, write: true });
    await addMember(owner, quest.questId, member);
    await addInvitee(owner, quest.questId, invitee);
    const origin = fakeZoteroOrigin();
    const { zoteroUserId } = quest.account;
    const [austen = "", zola = ""] = quest.itemKeys;
    await addZoteroNote(
      origin,
      zoteroUserId,
      austen,
      [
        '<div data-schema-version="9">',
        "<p>Free indirect speech &amp; irony.</p><p>Chapter 3.</p>",
        "</div>",
      ].join(""),
    );
    await addZoteroNote(
      origin,
      zoteroUserId,
      zola,
      "<h1>Mining</h1><p>The <b>strike</b> scenes.</p>",
    );

    expect(await sync(quest)).toBe("synced");
    expect(await notesOn(quest, "Austen")).toEqual([
      {
        id: expect.any(String),
        text: "Free indirect speech & irony.\nChapter 3.",
        waiting: false,
        editable: true,
        author: "Autumn",
      },
    ]);
    // A note with formatting reads as its text, to edit in Zotero.
    const [formatted] = await notesOn(quest, "Zola");
    expect(formatted).toMatchObject({
      text: "Mining\nThe strike scenes.",
      editable: false,
    });
    expect(
      await writeNote(
        owner,
        quest,
        { author: "Zola", noteId: formatted?.id },
        "Plain now",
      ),
    ).toBe("formatted");

    // A member adds a note; an invitee can't.
    expect(
      await writeNote(member, quest, { author: "Zola" }, "  Compare Hugo.  "),
    ).toBe("saved");
    expect(
      await writeNote(invitee, quest, { author: "Zola" }, "Not mine"),
    ).toBe("missing");
    const waiting = await zoteroListOf(member, quest);
    expect(waiting.pending).toBe(1);
    expect(referenceBy(waiting, "Zola").notes[1]).toMatchObject({
      text: "Compare Hugo.",
      waiting: true,
      editable: true,
      author: "Rowan",
    });
    // Nothing reaches Zotero before the owner syncs.
    expect(await noteWrites(quest)).toEqual([]);

    expect(await sync(quest)).toBe("synced");
    const writes = await noteWrites(quest);
    expect(writes).toEqual([
      expect.objectContaining({
        parentItem: zola,
        note: "<p>Compare Hugo.</p>",
      }),
    ]);
    const after = await zoteroListOf(owner, quest);
    expect(after.pending).toBe(0);
    expect(after.lastSync).toMatchObject({
      kind: "synced",
      sent: 0,
      notesSent: 1,
      waiting: 0,
    });
    expect(referenceBy(after, "Zola").notes.map(({ text }) => text)).toEqual([
      "Mining\nThe strike scenes.",
      "Compare Hugo.",
    ]);
    // The sent note keeps its writer.
    expect(referenceBy(after, "Zola").notes[1]).toMatchObject({
      waiting: false,
      author: "Rowan",
    });

    // A second sync sends nothing again.
    expect(await sync(quest)).toBe("synced");
    expect(await noteWrites(quest)).toHaveLength(writes.length);
  });

  test("an edit is sent over Zotero's, even when Zotero changed it first", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, { items: TWO_BOOKS, write: true });
    const origin = fakeZoteroOrigin();
    const { zoteroUserId } = quest.account;
    const [austen = ""] = quest.itemKeys;
    const noteKey = await addZoteroNote(
      origin,
      zoteroUserId,
      austen,
      "<p>First thoughts</p>",
    );
    await sync(quest);
    const [note] = await notesOn(quest, "Austen");

    expect(
      await writeNote(
        owner,
        quest,
        { author: "Austen", noteId: note?.id },
        "Second thoughts\n\n\nwith a gap",
      ),
    ).toBe("saved");
    await interfereWithZoteroNote(origin, zoteroUserId, noteKey, {
      note: "<p>Edited in Zotero</p>",
    });
    expect(await sync(quest)).toBe("synced");
    const now = await zoteroItemNow(origin, zoteroUserId, noteKey);
    expect(now).toMatchObject({
      note: "<p>Second thoughts</p><p></p><p>with a gap</p>",
    });
    expect(await notesOn(quest, "Austen")).toMatchObject([
      { id: note?.id, text: "Second thoughts\n\nwith a gap", waiting: false },
    ]);

    // Writing a note back to what Zotero has leaves nothing to send.
    await writeNote(
      owner,
      quest,
      { author: "Austen", noteId: note?.id },
      "Changed my mind",
    );
    expect((await zoteroListOf(owner, quest)).pending).toBe(1);
    await writeNote(
      owner,
      quest,
      { author: "Austen", noteId: note?.id },
      "Second thoughts\n\nwith a gap",
    );
    expect((await zoteroListOf(owner, quest)).pending).toBe(0);
  });

  test("a note edited in Zotero shows Zotero's text, and a waiting note deleted there is added again", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    await Promise.all([named(owner, "Autumn"), named(member, "Rowan")]);
    const quest = await zoteroQuest(owner, { items: TWO_BOOKS, write: true });
    await addMember(owner, quest.questId, member);
    const origin = fakeZoteroOrigin();
    const { zoteroUserId } = quest.account;
    await writeNote(member, quest, { author: "Austen" }, "Rowan's note");
    await writeNote(member, quest, { author: "Zola" }, "Another");
    await sync(quest);
    const [first, second] = await noteWrites(quest);

    // Someone edits the first in Zotero; its writer is the owner now.
    await editZoteroNote(origin, zoteroUserId, first?.noteKey ?? "", {
      note: "<p>Autumn's words</p>",
    });
    // The second is edited here, then deleted in Zotero before the sync.
    const [zolaNote] = await notesOn(quest, "Zola");
    await writeNote(
      member,
      quest,
      { author: "Zola", noteId: zolaNote?.id },
      "Another, longer",
    );
    await editZoteroNote(origin, zoteroUserId, second?.noteKey ?? "", {
      remove: true,
    });

    expect(await sync(quest)).toBe("synced");
    expect(await notesOn(quest, "Austen")).toMatchObject([
      { text: "Autumn's words", author: "Autumn", waiting: false },
    ]);
    const writes = await noteWrites(quest);
    expect(writes.at(-1)).toMatchObject({
      parentItem: second?.parentItem,
      note: "<p>Another, longer</p>",
    });
    expect(writes.at(-1)?.noteKey).not.toBe(second?.noteKey);
    expect(await notesOn(quest, "Zola")).toMatchObject([
      { text: "Another, longer", waiting: false, author: "Rowan" },
    ]);

    // A note deleted in Zotero that waits for nothing goes.
    await editZoteroNote(origin, zoteroUserId, writes.at(-1)?.noteKey ?? "", {
      remove: true,
    });
    expect(await sync(quest)).toBe("synced");
    expect(await notesOn(quest, "Zola")).toEqual([]);
  });

  test("Discard drops new notes and puts edited ones back", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, { items: TWO_BOOKS, write: true });
    const [austen = ""] = quest.itemKeys;
    await addZoteroNote(
      fakeZoteroOrigin(),
      quest.account.zoteroUserId,
      austen,
      "<p>Kept</p>",
    );
    await sync(quest);
    const [note] = await notesOn(quest, "Austen");
    await writeNote(
      owner,
      quest,
      { author: "Austen", noteId: note?.id },
      "Lost",
    );
    await writeNote(owner, quest, { author: "Zola" }, "Never sent");
    expect((await zoteroListOf(owner, quest)).pending).toBe(2);

    expect(
      await discardZoteroChanges(owner.id, quest.questId, quest.listId),
    ).toBe(true);
    const after = await zoteroListOf(owner, quest);
    expect(after.pending).toBe(0);
    expect(referenceBy(after, "Austen").notes).toMatchObject([
      { text: "Kept", waiting: false },
    ]);
    expect(referenceBy(after, "Zola").notes).toEqual([]);
  });

  test("sending notes needs write access, and a work that left drops its waiting note", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, { items: TWO_BOOKS });
    const origin = fakeZoteroOrigin();
    const [austen = ""] = quest.itemKeys;
    await writeNote(owner, quest, { author: "Austen" }, "On Emma");
    await writeNote(owner, quest, { author: "Zola" }, "On Germinal");

    expect(await sync(quest)).toBe("no-write-access");
    const refused = await zoteroListOf(owner, quest);
    expect(refused.pending).toBe(2);
    expect(refused.lastSync).toMatchObject({
      kind: "failed",
      problem: "no-write-access",
      notesSent: 0,
    });
    expect(await noteWrites(quest)).toEqual([]);

    await connectZotero(owner, quest.account, true);
    await editZoteroItem(origin, quest.account.zoteroUserId, austen, {
      collections: [],
    });
    expect(await sync(quest)).toBe("synced");
    expect(await noteWrites(quest)).toEqual([
      expect.objectContaining({ note: "<p>On Germinal</p>" }),
    ]);
    const after = await zoteroListOf(owner, quest);
    expect(after.pending).toBe(0);
    expect(after.lastSync).toMatchObject({
      notesSent: 1,
      skipped: [{ key: austen }],
    });
  });
});
