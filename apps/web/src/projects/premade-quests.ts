import { type ActivityId, DAILIES_ACTIVITY_ID } from "@/activities/activity.ts";

// The four ways to start a quest. Each is an ordinary quest with a
// suggested name, starting Journal and activity, all editable before it
// starts; saved quests keep no connection to their starting point, except
// that Dailies is the user's one ongoing quest for starting the day.
// A Journal holds no next step: the plan keeps the steps the user agrees to
// (docs/quest-plan.md).
type PremadeQuestId = "dailies" | "learn" | "make" | "do";

interface PremadeQuest {
  readonly id: PremadeQuestId;
  readonly name: string;
  readonly description: string;
  readonly activityId: ActivityId;
  readonly journal: string;
}

// What a start point fills in for the user, overriding the premade quest's
// own suggestions, such as an activity chosen on its page or a summary of
// a Chat.
interface QuestStartPreset {
  readonly name?: string | undefined;
  readonly journal?: string | undefined;
  readonly activityId?: string | undefined;
  readonly constructId?: string | undefined;
}

const PREMADE_QUESTS: readonly PremadeQuest[] = [
  {
    id: "dailies",
    name: "Dailies",
    description:
      "Start each day here: notice what matters and choose one manageable next step. One ongoing quest you come back to.",
    activityId: DAILIES_ACTIVITY_ID,
    journal: `## Goal
Start each day with a clear head and one manageable next step.

## What matters to me
- (Add routines, priorities or things to keep in mind.)`,
  },
  {
    id: "learn",
    name: "Learn a thing",
    description:
      "Find your starting point and learn by doing, one small practice step at a time.",
    activityId: "learn-a-thing",
    journal: `## Goal
Learn something I choose. What it is, how deep to go and how to practise are still open.

## Possible milestones (planned)
- Say what I want to learn and where I'm starting from.
- Try a first small practice step.
- Use it on something of my own.`,
  },
  {
    id: "make",
    name: "Make a thing",
    description:
      "Discover what you want to make and get to a small first version.",
    activityId: "find-something-to-make",
    journal: `## Goal
Make something that feels like my own. The medium, tools and subject are still open.

## Possible milestones (planned)
- Find an idea I want to try.
- Make a small first version.
- Refine it and decide when it feels finished.`,
  },
  {
    id: "do",
    name: "Do a thing",
    description:
      "Any other outcome you want: break it into steps and take the first one.",
    activityId: "project-breakdown",
    journal: `## Goal
Get something done that matters to me. What it is and what done looks like are still open.

## Possible milestones (planned)
- Say what done looks like.
- Break it into small steps.
- Take the first step.`,
  },
];

export type { PremadeQuest, PremadeQuestId, QuestStartPreset };
export { PREMADE_QUESTS };
