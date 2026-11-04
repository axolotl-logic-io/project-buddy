import {
  parseBuddyDefinition,
  storedBuddyPrompt,
} from "@/buddies/buddy-definition.ts";
import { type BuddyDefinition, getBuddy, isBuddyId } from "@/buddies/index.ts";
import type { Transaction } from "@/db/client.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";
import {
  type BoughtPrompt,
  cloneOwnPrompt,
  createOwnPrompt,
  type DefinitionEdit,
  type DefinitionStore,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  type OwnPromptChoice,
  saveBoughtPrompt,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";

type OwnBuddy = OwnPrompt<BuddyDefinition>;

type OwnBuddyChoice = OwnPromptChoice;

type BuddyEdit = DefinitionEdit<BuddyDefinition>;

const BUDDY_STORE: DefinitionStore<BuddyDefinition> = {
  kind: "buddy",
  encodeDefinition: storedBuddyPrompt,
  parseDefinition: parseBuddyDefinition,
  builtIn: (id: string) => {
    if (!isBuddyId(id)) {
      return;
    }
    return getBuddy(id);
  },
};

export function listBuddies(owner: UserId): Promise<OwnBuddy[]> {
  return listOwnPrompts(BUDDY_STORE, owner);
}

export function getOwnBuddy(
  owner: UserId,
  id: string,
): Promise<OwnBuddy | undefined> {
  return getOwnPrompt(BUDDY_STORE, owner, id);
}

export function createBuddy(
  owner: UserId,
  buddy: NamedDefinition<BuddyDefinition>,
): Promise<OwnBuddy> {
  return createOwnPrompt(BUDDY_STORE, owner, buddy);
}

export function cloneBuddy(
  owner: UserId,
  sourceId: string,
): Promise<OwnBuddy | undefined> {
  return cloneOwnPrompt(BUDDY_STORE, owner, sourceId);
}

export function updateBuddy(
  owner: UserId,
  id: string,
  edit: BuddyEdit,
): Promise<OwnBuddy | undefined> {
  return updateOwnPrompt(BUDDY_STORE, owner, id, edit);
}

export function deleteBuddy(owner: UserId, id: string): Promise<boolean> {
  return deleteOwnPrompt(BUDDY_STORE, owner, id);
}

export function saveBoughtBuddy(
  transaction: Transaction,
  owner: UserId,
  bought: BoughtPrompt,
): Promise<OwnPromptId | undefined> {
  return saveBoughtPrompt(BUDDY_STORE, transaction, owner, bought);
}

export type { BuddyEdit, OwnBuddy, OwnBuddyChoice };
