import type { NewChatConstruct } from "@/chats/new-chat-store.ts";
import { getOwnConstruct } from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
  isConstructId,
} from "@/constructs/index.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";

interface ChosenConstruct {
  readonly id: ConstructId | OwnPromptId;
  readonly construct: NewChatConstruct;
}

async function chosenConstruct(
  owner: UserId,
  constructId: string | undefined,
): Promise<ChosenConstruct | undefined> {
  if (constructId === undefined) {
    return {
      id: DEFAULT_CONSTRUCT_ID,
      construct: getConstruct(DEFAULT_CONSTRUCT_ID),
    };
  }
  if (isConstructId(constructId)) {
    return { id: constructId, construct: getConstruct(constructId) };
  }
  const own = await getOwnConstruct(owner, constructId);
  if (own === undefined) {
    return undefined;
  }
  return {
    id: own.id,
    construct: {
      id: DEFAULT_CONSTRUCT_ID,
      name: own.name,
      definition: own.definition,
    },
  };
}

export type { ChosenConstruct };
export { chosenConstruct };
