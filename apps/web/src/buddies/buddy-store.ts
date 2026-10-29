// The user's own buddies, in the own prompt store
// (src/prompts/own-prompt-store.ts), which keeps each its owner's alone.
import { parseBuddyParts } from "@/buddies/buddy-parts-schema.ts";
import { type BuddyParts, getBuddy, isBuddyId } from "@/buddies/index.ts";
import type { UserId } from "@/ids.ts";
import {
  cloneOwnPrompt,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  type OwnPromptChoice,
  type PromptEdit,
  type PromptKindStore,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";

// A buddy of the user's own.
type OwnBuddy = OwnPrompt<BuddyParts>;

// One of her buddies as a form offers it: its id and name alone.
type OwnBuddyChoice = OwnPromptChoice;

// What an edit changes: the name, the parts, or both.
type BuddyEdit = PromptEdit<BuddyParts>;

const BUDDY_STORE: PromptKindStore<BuddyParts> = {
  kind: "buddy",
  parseParts: parseBuddyParts,
  builtIn: (id: string) => {
    if (!isBuddyId(id)) {
      return;
    }
    return getBuddy(id);
  },
};

// The owner's buddies, oldest first.
export function listBuddies(owner: UserId): Promise<OwnBuddy[]> {
  return listOwnPrompts(BUDDY_STORE, owner);
}

// The owner's buddy with this id, or undefined if the id is malformed,
// unknown or another user's.
export function getOwnBuddy(
  owner: UserId,
  id: string,
): Promise<OwnBuddy | undefined> {
  return getOwnPrompt(BUDDY_STORE, owner, id);
}

// A new buddy of the owner's, a copy of the buddy with the id sourceId,
// named as it is with " (clone)" after: a built-in buddy, or one of the
// owner's own. Undefined, saving nothing, if the source is none of those.
export function cloneBuddy(
  owner: UserId,
  sourceId: string,
): Promise<OwnBuddy | undefined> {
  return cloneOwnPrompt(BUDDY_STORE, owner, sourceId);
}

// The owner's buddy with this id, edited, or undefined, changing nothing,
// if the id is malformed, unknown or another user's.
export function updateBuddy(
  owner: UserId,
  id: string,
  edit: BuddyEdit,
): Promise<OwnBuddy | undefined> {
  return updateOwnPrompt(BUDDY_STORE, owner, id, edit);
}

// Deletes the owner's buddy with this id. False, deleting nothing, if the
// id is malformed, unknown or another user's.
export function deleteBuddy(owner: UserId, id: string): Promise<boolean> {
  return deleteOwnPrompt(BUDDY_STORE, owner, id);
}

export type { BuddyEdit, OwnBuddy, OwnBuddyChoice };
