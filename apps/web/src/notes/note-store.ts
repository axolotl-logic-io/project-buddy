// A quest's Quick Notes, open to the quest's owner and members. Every
// function takes the acting user first; a quest not open to them has no
// notes and takes none. No model is called.
import { and, desc, eq, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { noteOpenTo, questOpenTo } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { questNotes } from "@/db/tables/quest-notes.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { NOTE_ID, type Note, type NoteId } from "@/notes/note.ts";

// The quest's Quick Notes, newest first.
function listNotes(owner: UserId, questId: QuestId): Promise<Note[]> {
  return withAppErrors("listNotes", async () => {
    const rows = await getDb()
      .select({
        id: questNotes.id,
        text: questNotes.text,
        savedAt: questNotes.createdAt,
      })
      .from(questNotes)
      .where(and(eq(questNotes.questId, questId), noteOpenTo(owner)))
      .orderBy(desc(questNotes.createdAt), desc(questNotes.id));
    return rows.map((row) => ({ ...row, id: NOTE_ID.parse(row.id) }));
  });
}

// Saves text, already checked, as a Quick Note of the owner's Active quest.
// False when the owner has no such Active quest, so nothing was saved.
function saveNote(
  owner: UserId,
  { questId, text }: { readonly questId: QuestId; readonly text: string },
): Promise<boolean> {
  return withAppErrors("saveNote", async () => {
    const rows = await getDb()
      .insert(questNotes)
      .select(
        new QueryBuilder()
          .select({
            id: sql`gen_random_uuid()`.as("id"),
            questId: quests.id,
            text: sql`${text}::text`.as("text"),
            createdAt: sql`now()`.as("created_at"),
          })
          .from(quests)
          .where(
            and(
              eq(quests.id, questId),
              questOpenTo(owner),
              eq(quests.status, "active"),
            ),
          ),
      )
      .returning({ id: questNotes.id });
    return rows.length > 0;
  });
}

// Takes the Quick Note out of the owner's quest. A note that is already
// gone, or isn't theirs, is left as it is.
function deleteNote(
  owner: UserId,
  { questId, id }: { readonly questId: QuestId; readonly id: NoteId },
): Promise<void> {
  return withAppErrors("deleteNote", async () => {
    await getDb()
      .delete(questNotes)
      .where(
        and(
          eq(questNotes.questId, questId),
          eq(questNotes.id, id),
          noteOpenTo(owner),
        ),
      );
  });
}

export { deleteNote, listNotes, saveNote };
