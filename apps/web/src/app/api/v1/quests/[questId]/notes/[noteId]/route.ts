import {
  apiItems,
  type QuestCall,
  type QuestParams,
  questRoute,
} from "@/api/api-route.ts";
import { NOTE_ID } from "@/notes/note.ts";
import { deleteNote, listNotes } from "@/notes/note-store.ts";

interface NoteParams extends QuestParams {
  readonly noteId: string;
}

// Deletes the Quick Note. Deleting one that is gone changes nothing, so a
// retry succeeds. Answers with the notes after it.
export const DELETE = questRoute(
  async ({ user, quest, params }: QuestCall<NoteParams>): Promise<Response> => {
    const id = NOTE_ID.safeParse(params.noteId);
    if (id.success) {
      await deleteNote(user.id, { questId: quest.id, id: id.data });
    }
    return apiItems(await listNotes(user.id, quest.id));
  },
);
