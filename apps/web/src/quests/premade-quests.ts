import { type ActivityId, DAILIES_ACTIVITY_ID } from "@/activities/activity.ts";

// The four ways to start a quest. Each is an ordinary quest with a
// starting name and activity; the user chooses a construct and
// optionally fills in Why before starting. Saved quests keep no connection
// to their starting point, except
// that Dailies is the user's one ongoing quest for starting the day.
// The Plan keeps the steps the user agrees to
// (docs/quest-plan.md).
type PremadeQuestId = "dailies" | "learn" | "make" | "do";

interface PremadeQuest {
  readonly id: PremadeQuestId;
  readonly name: string;
  // One short line, for where the starting points are shown side by side.
  readonly tagline: string;
  // What it is for, in a sentence or two, shown with its details.
  readonly description: string;
  readonly activityId: ActivityId;
  readonly context: string;
}

// What a start point fills in for the user, overriding the premade quest's
// own suggestions, such as a construct chosen on its page or a summary of
// a Chat. The activity is always the premade quest's.
interface QuestStartPreset {
  readonly name?: string | undefined;
  readonly context?: string | undefined;
  readonly constructId?: string | undefined;
}

const PREMADE_QUESTS: readonly PremadeQuest[] = [
  {
    id: "dailies",
    name: "Dailies",
    tagline: "Start your day",
    description:
      "Start each day here: notice what matters and choose one manageable next step. One ongoing quest you come back to.",
    activityId: DAILIES_ACTIVITY_ID,
    context: "",
  },
  {
    id: "learn",
    name: "Learn a thing",
    tagline: "Practise a skill",
    description:
      "Find your starting point and learn by doing, one small practice step at a time.",
    activityId: "learn-a-thing",
    context: "",
  },
  {
    id: "make",
    name: "Make a thing",
    tagline: "Build a first version",
    description:
      "Discover what you want to make and get to a small first version.",
    activityId: "find-something-to-make",
    context: "",
  },
  {
    id: "do",
    name: "Do a thing",
    tagline: "Reach an outcome",
    description:
      "Any other outcome you want: break it into steps and take the first one.",
    activityId: "project-breakdown",
    context: "",
  },
];

export type { PremadeQuest, PremadeQuestId, QuestStartPreset };
export { PREMADE_QUESTS };
