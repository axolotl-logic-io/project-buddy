import { z } from "zod";
import {
  apiItems,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { checkNoteText } from "@/notes/note.ts";
import { listNotes, saveNote } from "@/notes/note-store.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";

const NOTE_BODY = z.object({ text: z.string() });

// The quest's Quick Notes, newest first.
export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> =>
    apiItems(await listNotes(user.id, quest.id)),
);

// Saves a Quick Note with the site's text rules. Only an Active quest takes
// one. Answers with the notes after it.
export const POST = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, NOTE_BODY);
    if (body instanceof Response) {
      return body;
    }
    const checked = checkNoteText(body.text);
    if ("problem" in checked) {
      return apiProblem(
        "invalid_input",
        QUICK_NOTE_COPY.problem(checked.problem),
        "text",
      );
    }
    if (!(await saveNote(user.id, { questId: quest.id, text: checked.text }))) {
      return apiProblem("conflict", QUICK_NOTE_COPY.notFound);
    }
    return apiItems(await listNotes(user.id, quest.id));
  },
);
