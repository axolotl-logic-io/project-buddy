// Starting a quest from one of the starting points
// (src/quests/premade-quests.ts), as the site's start form and the API both
// do: Dailies resumes the user's own Dailies when they have one, and every
// other starting point starts a new quest with its construct.
import type { UserId } from "@/ids.ts";
import {
  PREMADE_QUESTS,
  type PremadeQuestId,
} from "@/quests/premade-quests.ts";
import type { QuestName } from "@/quests/quest-name.ts";
import { createOrResumeQuest, type StartedQuest } from "@/quests/store.ts";

// What to start: the starting point, the quest's name, its starting
// context and the user's optional Why.
interface PremadeStart {
  readonly premadeId: PremadeQuestId;
  readonly name: QuestName;
  readonly context: string;
  readonly motivation: string;
}

// Start a quest or resume the owner’s existing Dailies quest.
function startPremadeQuest(
  owner: UserId,
  { premadeId, name, context, motivation }: PremadeStart,
): Promise<StartedQuest> {
  const premade = PREMADE_QUESTS.find(({ id }) => id === premadeId);
  if (premade === undefined) {
    throw new Error(`No starting point has the id ${premadeId}`);
  }
  return createOrResumeQuest(owner, name, {
    constructId: premade.constructId,
    startingContext: [context, motivation]
      .filter((text) => text !== "")
      .join("\n\n"),
    dailies: premadeId === "dailies",
  });
}

export type { PremadeStart };
export { startPremadeQuest };
