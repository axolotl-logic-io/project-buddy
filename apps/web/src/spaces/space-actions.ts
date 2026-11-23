"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { QUEST_ID } from "@/ids.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";
import { SPACE_ID, SPACE_WORDS } from "./space.ts";
import { saveSpace } from "./space-store.ts";

interface SpaceFormState {
  readonly draft?: Partial<Record<string, string>>;
  readonly error?: string;
  readonly saved?: boolean;
}

const SPACE_FORM = SPACE_WORDS.extend({
  questId: QUEST_ID,
  spaceId: SPACE_ID.optional(),
});

async function saveSpaceAction(
  _previous: SpaceFormState,
  form: FormData,
): Promise<SpaceFormState> {
  const user = await requireUser();
  const draft: Record<string, string> = {};
  for (const [key, value] of form) {
    if (typeof value === "string") {
      draft[key] = value;
    }
  }
  const input = SPACE_FORM.safeParse(draft);
  if (!input.success) {
    const [issue] = input.error.issues;
    return { draft, error: `${issue?.path.join(".")} — ${issue?.message}` };
  }
  try {
    const { questId, spaceId, ...words } = input.data;
    const space = await saveSpace(user.id, questId, words, spaceId);
    if (space === undefined) {
      return { draft, error: SPACES_COPY.unavailable };
    }
    refresh();
    return { saved: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { draft, error: error.message };
    }
    throw error;
  }
}

export type { SpaceFormState };
export { saveSpaceAction };
