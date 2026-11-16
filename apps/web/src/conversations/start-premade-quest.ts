// Starting a quest from one of the starting points
// (src/quests/premade-quests.ts), as the site's start form and the API both
// do: Dailies resumes the user's own Dailies when they have one, and every
// other starting point starts a new quest with its construct.
import { getConstruct } from "@/constructs/index.ts";
import {
  type StartDailiesResult,
  startDailies,
} from "@/conversations/dailies.ts";
import { startQuest } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuestId,
} from "@/quests/premade-quests.ts";
import type { QuestName } from "@/quests/quest-name.ts";

// What to start: the starting point, the quest's name, its starting
// context and the user's optional Why.
interface PremadeStart {
  readonly premadeId: PremadeQuestId;
  readonly name: QuestName;
  readonly context: string;
  readonly motivation: string;
}

// The quest started or resumed, with its conversation, or why its opening
// was unavailable. A storage failure throws.
async function startPremadeQuest(
  owner: UserId,
  { premadeId, name, context, motivation }: PremadeStart,
): Promise<StartDailiesResult> {
  const premade = PREMADE_QUESTS.find(({ id }) => id === premadeId);
  if (premade === undefined) {
    throw new Error(`No starting point has the id ${premadeId}`);
  }
  const construct = getConstruct(premade.constructId);
  if (premadeId === "dailies") {
    return await startDailies(owner, { name, context, motivation, construct });
  }
  return await startQuest(owner, name, construct, { context, motivation });
}

export type { PremadeStart };
export { startPremadeQuest };
