import type { ActivityDefinition, ActivityId } from "@/activities/activity.ts";
import type { ConstructDefinition, ConstructId } from "@/constructs/index.ts";
import {
  matchingBuiltInActivity,
  matchingBuiltInConstruct,
} from "@/prompts/matching-built-in.ts";

const PREPARED_OPENINGS: Readonly<
  Record<ActivityId, Readonly<Record<ConstructId, string>>>
> = {
  "open-chat": {
    vellum:
      "Welcome. I have a clean sheet unrolled and my ink ready. What shall we chart today: a piece of work, an idea to talk through, or a question?",
    lumen:
      "*fzzt* Oh, hello! The runes are spinning and I'm all lit up. What are we working on today: a task, an idea, or a question?",
  },
  interview: {
    vellum:
      "A new quest, and a new map to draw. Before I mark a single road, I need the landmark we are heading for. What would you like to make or learn?",
    lumen:
      "A new quest! I'm practically humming. Before we light the way, tell me where it leads. What would you like to make or learn?",
  },
  brainstorming: {
    vellum:
      "Let us sketch freely for a while, in pencil, before anything is inked. What idea or plan would you like to explore?",
    lumen:
      "Ooh, sparks! The best ideas catch from other ideas. What idea or plan shall we light up first?",
  },
  "project-breakdown": {
    vellum:
      "A far landmark is reached one road at a time. Which goal shall we chart into steps?",
    lumen:
      "Big goals are easier to see one bright spot at a time. Which goal shall we break into steps?",
  },
};

function preparedOpening(
  construct: ConstructDefinition,
  activity: ActivityDefinition,
): string | undefined {
  const builtInConstruct = matchingBuiltInConstruct(construct);
  const builtInActivity = matchingBuiltInActivity(activity);
  if (builtInConstruct === undefined || builtInActivity === undefined) {
    return undefined;
  }
  return PREPARED_OPENINGS[builtInActivity.id][builtInConstruct.id];
}

export { preparedOpening };
