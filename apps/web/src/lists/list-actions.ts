"use server";

import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { QUEST_ID } from "@/ids.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { LIST_ID, LIST_SETTINGS } from "./list.ts";
import { saveList } from "./list-store.ts";

interface ListFormState {
  readonly draft?: Partial<Record<string, string>>;
  readonly error?: string;
  readonly saved?: boolean;
}

const LIST_FORM = LIST_SETTINGS.extend({
  questId: QUEST_ID,
  listId: LIST_ID.optional(),
});

async function saveListAction(
  _previous: ListFormState,
  form: FormData,
): Promise<ListFormState> {
  const user = await requireUser();
  const draft: Record<string, string> = {};
  for (const [key, value] of form) {
    if (typeof value === "string") {
      draft[key] = value;
    }
  }
  const input = LIST_FORM.safeParse(draft);
  if (!input.success) {
    const [issue] = input.error.issues;
    return { draft, error: `${issue?.path.join(".")} — ${issue?.message}` };
  }
  try {
    const { questId, listId, ...settings } = input.data;
    const list = await saveList(user.id, questId, settings, listId);
    if (list === undefined) {
      return { draft, error: LISTS_COPY.unavailable };
    }
    if (list === "invalid-text") {
      return { draft, error: LISTS_COPY.typeTooLong };
    }
    return { saved: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { draft, error: error.message };
    }
    throw error;
  }
}

export { saveListAction };
