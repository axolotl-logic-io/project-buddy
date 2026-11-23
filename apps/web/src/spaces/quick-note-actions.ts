"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { inTransaction } from "@/db/client.ts";
import { QUEST_ID } from "@/ids.ts";
import { listQuests } from "@/quests/store.ts";
import { checkNoteText, type NoteQuest } from "@/spaces/quick-note.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { changeWithin } from "./murmling-store.ts";
import { SPACE_ID } from "./space.ts";
import { listSpaces } from "./space-store.ts";

interface QuickNoteQuest extends NoteQuest {
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

type QuickNoteResult =
  | { readonly kind: "saved" }
  | {
      readonly kind: "problem";
      readonly text:
        | typeof QUICK_NOTE_COPY.chooseSpace
        | typeof QUICK_NOTE_COPY.spaceUnavailable
        | ReturnType<typeof QUICK_NOTE_COPY.problem>;
    };

const REQUEST = z.object({
  questId: QUEST_ID,
  spaceId: SPACE_ID,
  text: z.string(),
});

async function listQuickNoteQuests(): Promise<QuickNoteQuest[]> {
  const user = await requireUser();
  const quests = await listQuests(user.id);
  return Promise.all(
    quests
      .filter(({ status }) => status === "active")
      .map(async ({ id, name, sharing }) => {
        const spaces = await listSpaces(user.id, id);
        return {
          id,
          name,
          sharing,
          spaces: spaces.map(({ id: spaceId, name: spaceName }) => ({
            id: spaceId,
            name: spaceName,
          })),
        };
      }),
  );
}

async function saveQuickNote(request: unknown): Promise<QuickNoteResult> {
  const user = await requireUser();
  const input = REQUEST.safeParse(request).data;
  if (input === undefined) {
    return { kind: "problem", text: QUICK_NOTE_COPY.chooseSpace };
  }
  const checked = checkNoteText(input.text);
  if ("problem" in checked) {
    return { kind: "problem", text: QUICK_NOTE_COPY.problem(checked.problem) };
  }
  const { questId, spaceId } = input;
  const result = await inTransaction((tx) =>
    changeWithin(
      tx,
      user.id,
      { questId, spaceId, activeOnly: true, atTop: true },
      { kind: "add", type: "quick-note", text: checked.text },
    ),
  );
  if (result !== "saved") {
    return { kind: "problem", text: QUICK_NOTE_COPY.spaceUnavailable };
  }
  refresh();
  return { kind: "saved" };
}

export type { QuickNoteQuest };
export { listQuickNoteQuests, saveQuickNote };
