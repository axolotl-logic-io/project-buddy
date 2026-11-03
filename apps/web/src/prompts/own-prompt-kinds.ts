// Each kind of own prompt, as code that works with prompts of any kind
// needs it, such as the Marketplace (src/marketplace/): the owner's prompt
// of the kind, whether its parts are still a built-in one's, and saving a
// bought copy. Its page is own-prompt-paths.ts's.
// A kind added to PROMPT_KINDS fails to compile here until it is named.
import {
  getOwnActivity,
  saveBoughtActivity,
} from "@/activities/activity-store.ts";
import { getOwnBuddy, saveBoughtBuddy } from "@/buddies/buddy-store.ts";
import type { Transaction } from "@/db/client.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";
import {
  builtInActivityWithParts,
  builtInBuddyWithParts,
  builtInSpellWithParts,
} from "@/prompts/built-in-parts.ts";
import type { BoughtPrompt, OwnPrompt } from "@/prompts/own-prompt-store.ts";
import type { PromptKind } from "@/prompts/prompt.ts";
import { getOwnSpell, saveBoughtSpell } from "@/spells/spell-store.ts";

// One of the owner's prompts, of whatever kind, and whether its parts are
// still a built-in one's, as a copy the user has only renamed has.
interface FoundOwnPrompt {
  readonly prompt: OwnPrompt<unknown>;
  readonly builtInParts: boolean;
}

interface OwnPromptKind {
  // The owner's prompt of the kind with this id, or undefined if the id is
  // malformed, unknown, another user's or of another kind.
  readonly find: (
    owner: UserId,
    id: string,
  ) => Promise<FoundOwnPrompt | undefined>;
  // Saves, in the transaction, the owner's copy of a prompt of the kind
  // bought from the listing, as the kind's store keeps it.
  readonly saveBought: (
    transaction: Transaction,
    owner: UserId,
    bought: BoughtPrompt,
  ) => Promise<OwnPromptId | undefined>;
}

// The finder of a kind whose store reads its prompts with get and whose
// built-in prompts builtInWithParts matches.
function finder<Parts>(
  get: (owner: UserId, id: string) => Promise<OwnPrompt<Parts> | undefined>,
  builtInWithParts: (parts: Parts) => unknown,
): OwnPromptKind["find"] {
  return async (
    owner: UserId,
    id: string,
  ): Promise<FoundOwnPrompt | undefined> => {
    const prompt = await get(owner, id);
    if (prompt === undefined) {
      return;
    }
    return {
      prompt,
      builtInParts: builtInWithParts(prompt.parts) !== undefined,
    };
  };
}

const OWN_PROMPT_KINDS: Readonly<Record<PromptKind, OwnPromptKind>> = {
  buddy: {
    find: finder(getOwnBuddy, builtInBuddyWithParts),
    saveBought: saveBoughtBuddy,
  },
  activity: {
    find: finder(getOwnActivity, builtInActivityWithParts),
    saveBought: saveBoughtActivity,
  },
  spell: {
    find: finder(getOwnSpell, builtInSpellWithParts),
    saveBought: saveBoughtSpell,
  },
};

// The owner's prompt of the kind with this id, and whether its parts are
// still a built-in one's, or undefined if it isn't one of theirs.
function findOwnPrompt(
  owner: UserId,
  kind: PromptKind,
  id: string,
): Promise<FoundOwnPrompt | undefined> {
  return OWN_PROMPT_KINDS[kind].find(owner, id);
}

// Saves, in the transaction, the owner's copy of the prompt of the kind
// bought from a listing, and gives its id; undefined, saving nothing, if
// its name and parts aren't the kind's, within the kind's limits.
function saveBoughtCopy(
  transaction: Transaction,
  owner: UserId,
  bought: BoughtPrompt & { readonly kind: PromptKind },
): Promise<OwnPromptId | undefined> {
  return OWN_PROMPT_KINDS[bought.kind].saveBought(transaction, owner, bought);
}

export type { FoundOwnPrompt };
export { findOwnPrompt, saveBoughtCopy };
