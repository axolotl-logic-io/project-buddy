"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { QUEST_ID } from "@/ids.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { renameQuest } from "@/quests/store.ts";

type RenameQuestState =
  | { readonly kind: "idle" }
  | { readonly kind: "saved"; readonly name: string }
  | { readonly kind: "invalid"; readonly message: string };

const RENAME_FORM = z.object({ questId: QUEST_ID, name: QUEST_NAME });

async function renameQuestAction(
  _previous: RenameQuestState,
  form: FormData,
): Promise<RenameQuestState> {
  const user = await requireUser();
  const input = RENAME_FORM.safeParse(Object.fromEntries(form));
  if (!input.success) {
    return { kind: "invalid", message: input.error.issues[0]?.message ?? "" };
  }
  try {
    if (!(await renameQuest(user.id, input.data.questId, input.data.name))) {
      notFound();
    }
    refresh();
    return { kind: "saved", name: input.data.name };
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "invalid", message: error.message };
    }
    throw error;
  }
}

export type { RenameQuestState };
export { renameQuestAction };
