import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import type { ConstructId } from "@/constructs/index.ts";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";

interface QuestCreationChoices {
  readonly userConstructs: readonly OwnConstructChoice[];
  readonly preferredConstructId: ConstructId | OwnPromptId;
}

async function questCreationChoices(
  owner: UserId,
): Promise<QuestCreationChoices> {
  const [userConstructs, preferred] = await Promise.all([
    ownConstructChoices(),
    interviewConstruct(owner),
  ]);
  return { userConstructs, preferredConstructId: preferred.id };
}

export type { QuestCreationChoices };
export { questCreationChoices };
