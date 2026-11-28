"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { linkOrigin } from "@/accounts/emailed-link.ts";
import { requireUser } from "@/auth/current-user.ts";
import { expireReads } from "@/db/read-cache.ts";
import { AppError } from "@/errors/app-error.ts";
import { QUEST_ID, type QuestId, type UserId } from "@/ids.ts";
import { LIST_ID, LIST_WORD, type ListId } from "@/lists/list.ts";
import { getQuest } from "@/quests/store.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import { NOTE_MAX, tidyNote } from "./note-text.ts";
import {
  CHECKMARK_TAG,
  SYNC_PROBLEM,
  type SyncProblem,
  ZOTERO_KEY,
  ZOTERO_NOTE_ID,
  ZOTERO_REFERENCE_ID,
} from "./zotero.ts";
import {
  beginZoteroConnection,
  disconnectZotero,
} from "./zotero-connection.ts";
import {
  discardZoteroChanges,
  markZoteroReference,
  removeZoteroList,
  saveZoteroListSettings,
  saveZoteroNote,
} from "./zotero-list-store.ts";
import { importZoteroCollection, syncZoteroList } from "./zotero-sync.ts";

// What a Zotero form shows once it was sent: the values it was sent with,
// when they stay for another try, and what happened.
interface ZoteroFormState {
  readonly draft?: Partial<Record<string, string>>;
  readonly error?: string;
  readonly saved?: string;
}

// What a Zotero button shows once it was pressed.
interface ZoteroResult {
  readonly ok: boolean;
  readonly message?: string;
}

const CHECKBOX = z
  .literal("on")
  .optional()
  .transform((value) => value === "on");

const CONNECT_FORM = z.object({
  questId: QUEST_ID,
  // The section of the quest's page to come back to: setup or a list.
  section: z.union([z.literal("zotero"), LIST_ID]),
  write: CHECKBOX,
});

const CREATE_FORM = z.object({
  questId: QUEST_ID,
  collectionKey: ZOTERO_KEY,
  checkable: CHECKBOX,
  tag: z.string().optional(),
});

const SETTINGS_FORM = z.object({
  questId: QUEST_ID,
  listId: LIST_ID,
  name: LIST_WORD,
  checkable: CHECKBOX,
  tag: z.string().optional(),
});

const LIST_ARGUMENTS = z.object({ questId: QUEST_ID, listId: LIST_ID });

const MARK_ARGUMENTS = LIST_ARGUMENTS.extend({
  referenceId: ZOTERO_REFERENCE_ID,
  checked: z.boolean(),
});

const NOTE_ARGUMENTS = LIST_ARGUMENTS.extend({
  referenceId: ZOTERO_REFERENCE_ID,
  noteId: ZOTERO_NOTE_ID.optional(),
  text: z.string().transform(tidyNote).pipe(z.string().min(1).max(NOTE_MAX)),
});

function draftOf(form: FormData): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const [key, value] of form) {
    if (typeof value === "string") {
      draft[key] = value;
    }
  }
  return draft;
}

// Whether the user owns the quest: only its owner sets up its lists.
async function owns(user: UserId, questId: QuestId): Promise<boolean> {
  const quest = await getQuest(user, questId);
  return quest !== undefined && quest.sharing.kind !== "joined";
}

function listPath(questId: QuestId, section: string): string {
  return `/quests/${questId}?section=${section}`;
}

// The tag a checkable form names, undefined when it isn't checkable, or
// "invalid" when it names none.
function tagOf(
  checkable: boolean,
  tag: string | undefined,
): string | undefined | "invalid" {
  if (!checkable) {
    return undefined;
  }
  return CHECKMARK_TAG.safeParse(tag).data ?? "invalid";
}

async function withAppErrorMessage<T>(
  draft: Record<string, string>,
  run: () => Promise<T>,
): Promise<T | ZoteroFormState> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AppError) {
      return { draft, error: error.message };
    }
    throw error;
  }
}

// Sends the quest's owner to Zotero to approve access to their personal
// library, asking for permission to change it when write is on. Zotero
// sends them back to the section they came from.
async function connectZoteroAction(
  _previous: ZoteroFormState,
  form: FormData,
): Promise<ZoteroFormState> {
  const user = await requireUser();
  const input = CONNECT_FORM.safeParse(draftOf(form));
  if (!(input.success && (await owns(user.id, input.data.questId)))) {
    return { error: ZOTERO_COPY.settings.unavailable };
  }
  const { questId, section, write } = input.data;
  const started = await beginZoteroConnection(user.id, {
    origin: linkOrigin(await headers()),
    returnTo: listPath(questId, section),
    write,
  });
  if (started.kind !== "authorize") {
    return { error: ZOTERO_COPY.problems[started.kind] };
  }
  redirect(started.url);
}

// Imports the chosen collection as a new list at the end of the owner's
// quest, then opens it. A failed import keeps the choices for another try.
async function createZoteroListAction(
  _previous: ZoteroFormState,
  form: FormData,
): Promise<ZoteroFormState> {
  const user = await requireUser();
  const draft = draftOf(form);
  const input = CREATE_FORM.safeParse(draft);
  if (!input.success) {
    return { draft, error: ZOTERO_COPY.setup.chooseCollection };
  }
  const { questId, collectionKey, checkable } = input.data;
  const checkmarkTag = tagOf(checkable, input.data.tag);
  if (checkmarkTag === "invalid") {
    return { draft, error: ZOTERO_COPY.setup.tagProblem };
  }
  const outcome = await withAppErrorMessage(
    draft,
    async (): Promise<ListId | "missing" | SyncProblem> => {
      if (!(await owns(user.id, questId))) {
        return "missing";
      }
      return importZoteroCollection(user.id, questId, {
        collectionKey,
        checkmarkTag,
      });
    },
  );
  if (typeof outcome !== "string") {
    return outcome;
  }
  if (outcome === "missing") {
    return { draft, error: ZOTERO_COPY.settings.unavailable };
  }
  const problem = SYNC_PROBLEM.safeParse(outcome).data;
  if (problem !== undefined) {
    return { draft, error: ZOTERO_COPY.problems[problem] };
  }
  expireReads({ quests: [questId] });
  redirect(listPath(questId, outcome));
}

// Syncs the owner's Zotero Collection list with its collection.
async function syncZoteroListAction(
  questId: string,
  listId: string,
): Promise<ZoteroResult> {
  const user = await requireUser();
  const input = LIST_ARGUMENTS.safeParse({ questId, listId });
  if (!input.success) {
    return { ok: false, message: ZOTERO_COPY.settings.unavailable };
  }
  try {
    const outcome = await syncZoteroList(
      user.id,
      input.data.questId,
      input.data.listId,
    );
    expireReads({ quests: [input.data.questId] });
    if (outcome === "synced") {
      return { ok: true };
    }
    if (outcome === "missing") {
      return { ok: false, message: ZOTERO_COPY.settings.unavailable };
    }
    return { ok: false, message: ZOTERO_COPY.problems[outcome] };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

// Sets the user's checkmark on a reference, as a change the list's next
// sync sends to Zotero.
async function markZoteroReferenceAction(
  questId: string,
  listId: string,
  referenceId: string,
  checked: boolean,
): Promise<ZoteroResult> {
  const user = await requireUser();
  const input = MARK_ARGUMENTS.safeParse({
    questId,
    listId,
    referenceId,
    checked,
  });
  if (!input.success) {
    return { ok: false, message: ZOTERO_COPY.settings.unavailable };
  }
  try {
    const { checked: mark, ...where } = input.data;
    const outcome = await markZoteroReference(user.id, where, mark);
    expireReads({ quests: [where.questId] });
    if (outcome === "saved") {
      return { ok: true };
    }
    if (outcome === "closed") {
      return { ok: false, message: ZOTERO_COPY.list.marksClosed };
    }
    return { ok: false, message: ZOTERO_COPY.settings.unavailable };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

// Saves the user's note on a reference, new or edited, as a note the
// list's next sync sends to Zotero.
async function saveZoteroNoteAction(
  where: {
    readonly questId: string;
    readonly listId: string;
    readonly referenceId: string;
    readonly noteId: string | undefined;
  },
  text: string,
): Promise<ZoteroResult> {
  const user = await requireUser();
  const input = NOTE_ARGUMENTS.safeParse({ ...where, text });
  if (!input.success) {
    return { ok: false, message: ZOTERO_COPY.notes.problem };
  }
  try {
    const { text: note, noteId, ...place } = input.data;
    const outcome = await saveZoteroNote(user.id, { ...place, noteId }, note);
    expireReads({ quests: [place.questId] });
    if (outcome === "saved") {
      return { ok: true };
    }
    if (outcome === "closed") {
      return { ok: false, message: ZOTERO_COPY.notes.closed };
    }
    if (outcome === "formatted") {
      return { ok: false, message: ZOTERO_COPY.notes.formatted };
    }
    return { ok: false, message: ZOTERO_COPY.settings.unavailable };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

// Saves the owner's list name and checkmark tag.
async function saveZoteroListSettingsAction(
  _previous: ZoteroFormState,
  form: FormData,
): Promise<ZoteroFormState> {
  const user = await requireUser();
  const draft = draftOf(form);
  const input = SETTINGS_FORM.safeParse(draft);
  if (!input.success) {
    return { draft, error: ZOTERO_COPY.setup.tagProblem };
  }
  const { questId, listId, name, checkable } = input.data;
  const checkmarkTag = tagOf(checkable, input.data.tag);
  if (checkmarkTag === "invalid") {
    return { draft, error: ZOTERO_COPY.setup.tagProblem };
  }
  const outcome = await withAppErrorMessage(draft, () =>
    saveZoteroListSettings(
      user.id,
      { questId, listId },
      { name, checkmarkTag },
    ),
  );
  if (typeof outcome !== "string") {
    return outcome;
  }
  if (outcome === "missing") {
    return { draft, error: ZOTERO_COPY.settings.unavailable };
  }
  if (outcome === "pending") {
    return { draft, error: ZOTERO_COPY.settings.pending };
  }
  if (outcome === "needs-write") {
    return { draft, error: ZOTERO_COPY.setup.needsWrite };
  }
  expireReads({ quests: [questId] });
  return { saved: ZOTERO_COPY.settings.saved };
}

// Drops the waiting checkmark changes in the owner's list.
async function discardZoteroChangesAction(
  questId: string,
  listId: string,
): Promise<ZoteroResult> {
  const user = await requireUser();
  const input = LIST_ARGUMENTS.safeParse({ questId, listId });
  if (
    !(
      input.success &&
      (await discardZoteroChanges(
        user.id,
        input.data.questId,
        input.data.listId,
      ))
    )
  ) {
    return { ok: false, message: ZOTERO_COPY.settings.unavailable };
  }
  expireReads({ quests: [input.data.questId] });
  return { ok: true, message: ZOTERO_COPY.settings.discarded };
}

// Removes the owner's Zotero Collection list, then opens the quest.
async function removeZoteroListAction(
  questId: string,
  listId: string,
): Promise<ZoteroResult> {
  const user = await requireUser();
  const input = LIST_ARGUMENTS.safeParse({ questId, listId });
  if (
    !(
      input.success &&
      (await removeZoteroList(user.id, input.data.questId, input.data.listId))
    )
  ) {
    return { ok: false, message: ZOTERO_COPY.settings.unavailable };
  }
  expireReads({ quests: [input.data.questId] });
  redirect(`/quests/${input.data.questId}`);
}

// Ends the user's Zotero connection and revokes its key.
async function disconnectZoteroAction(): Promise<ZoteroResult> {
  const user = await requireUser();
  await disconnectZotero(user.id);
  expireReads({ accounts: [user.id] });
  return { ok: true };
}

export type { ZoteroFormState, ZoteroResult };
export {
  connectZoteroAction,
  createZoteroListAction,
  discardZoteroChangesAction,
  disconnectZoteroAction,
  markZoteroReferenceAction,
  removeZoteroListAction,
  saveZoteroListSettingsAction,
  saveZoteroNoteAction,
  syncZoteroListAction,
};
