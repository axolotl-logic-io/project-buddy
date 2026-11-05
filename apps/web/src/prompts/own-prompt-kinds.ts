import {
  getOwnActivity,
  saveBoughtActivity,
} from "@/activities/activity-store.ts";
import {
  getOwnConstruct,
  saveBoughtConstruct,
} from "@/constructs/construct-store.ts";
import type { Transaction } from "@/db/client.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";
import {
  matchingBuiltInActivity,
  matchingBuiltInConstruct,
  matchingBuiltInSpell,
} from "@/prompts/matching-built-in.ts";
import type { BoughtPrompt, OwnPrompt } from "@/prompts/own-prompt-store.ts";
import type { PromptKind } from "@/prompts/prompt.ts";
import { getOwnSpell, saveBoughtSpell } from "@/spells/spell-store.ts";

interface FoundOwnPrompt {
  readonly prompt: OwnPrompt<unknown>;
  readonly matchesBuiltIn: boolean;
}

interface OwnPromptKind {
  readonly find: (
    owner: UserId,
    id: string,
  ) => Promise<FoundOwnPrompt | undefined>;
  readonly saveBought: (
    transaction: Transaction,
    owner: UserId,
    bought: BoughtPrompt,
  ) => Promise<OwnPromptId | undefined>;
}

function finder<Definition>(
  get: (
    owner: UserId,
    id: string,
  ) => Promise<OwnPrompt<Definition> | undefined>,
  matchingBuiltIn: (parts: Definition) => unknown,
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
      matchesBuiltIn: matchingBuiltIn(prompt.definition) !== undefined,
    };
  };
}

const OWN_PROMPT_KINDS: Readonly<Record<PromptKind, OwnPromptKind>> = {
  construct: {
    find: finder(getOwnConstruct, matchingBuiltInConstruct),
    saveBought: saveBoughtConstruct,
  },
  activity: {
    find: finder(getOwnActivity, matchingBuiltInActivity),
    saveBought: saveBoughtActivity,
  },
  spell: {
    find: finder(getOwnSpell, matchingBuiltInSpell),
    saveBought: saveBoughtSpell,
  },
};

function findOwnPrompt(
  owner: UserId,
  kind: PromptKind,
  id: string,
): Promise<FoundOwnPrompt | undefined> {
  return OWN_PROMPT_KINDS[kind].find(owner, id);
}

function saveBoughtCopy(
  transaction: Transaction,
  owner: UserId,
  bought: BoughtPrompt & { readonly kind: PromptKind },
): Promise<OwnPromptId | undefined> {
  return OWN_PROMPT_KINDS[bought.kind].saveBought(transaction, owner, bought);
}

export type { FoundOwnPrompt };
export { findOwnPrompt, saveBoughtCopy };
