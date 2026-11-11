import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import {
  type ConstructDefinition,
  getConstruct,
  isConstructId,
} from "@/constructs/index.ts";
import type { ConstructVisual } from "@/constructs/visual.ts";
import type { UserId } from "@/ids.ts";
import {
  currentConstructText,
  earlierConstructText,
} from "@/prompts/earlier-built-in-texts.ts";
import {
  cloneOwnPrompt,
  createOwnPrompt,
  type DefinitionEdit,
  type DefinitionStore,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  type OwnPromptChoice,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";

type OwnConstruct = OwnPrompt<ConstructDefinition>;

type OwnConstructChoice = OwnPromptChoice & {
  readonly visual?: ConstructVisual | undefined;
};

type ConstructEdit = DefinitionEdit<ConstructDefinition>;

const CONSTRUCT_STORE: DefinitionStore<ConstructDefinition> = {
  kind: "construct",
  encodeDefinition: (text: ConstructDefinition): unknown =>
    storedConstructPrompt(earlierConstructText(text)),
  parseDefinition: (stored: unknown): ConstructDefinition | undefined => {
    const text = parseConstructDefinition(stored);
    if (text === undefined) {
      return;
    }
    return currentConstructText(text);
  },
  builtIn: (id: string) => {
    if (!isConstructId(id)) {
      return;
    }
    return getConstruct(id);
  },
};

export function listConstructs(owner: UserId): Promise<OwnConstruct[]> {
  return listOwnPrompts(CONSTRUCT_STORE, owner);
}

export function getOwnConstruct(
  owner: UserId,
  id: string,
): Promise<OwnConstruct | undefined> {
  return getOwnPrompt(CONSTRUCT_STORE, owner, id);
}

export function createConstruct(
  owner: UserId,
  construct: NamedDefinition<ConstructDefinition>,
): Promise<OwnConstruct> {
  return createOwnPrompt(CONSTRUCT_STORE, owner, construct);
}

export function cloneConstruct(
  owner: UserId,
  sourceId: string,
): Promise<OwnConstruct | undefined> {
  return cloneOwnPrompt(CONSTRUCT_STORE, owner, sourceId);
}

export function updateConstruct(
  owner: UserId,
  id: string,
  edit: ConstructEdit,
): Promise<OwnConstruct | undefined> {
  return updateOwnPrompt(CONSTRUCT_STORE, owner, id, edit);
}

export function deleteConstruct(owner: UserId, id: string): Promise<boolean> {
  return deleteOwnPrompt(CONSTRUCT_STORE, owner, id);
}

export type { ConstructEdit, OwnConstruct, OwnConstructChoice };
