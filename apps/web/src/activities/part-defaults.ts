// What each part of an activity is to its editor: the order the parts are
// shown in, the text each part resets to, and the parts an activity written
// from scratch starts with.
import type { ActivityParts } from "@/activities/activity.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";

type ActivityPartKey = keyof ActivityParts;

// Every part, in the order the activity page shows them.
const ACTIVITY_PART_KEYS: readonly ["instructions", "openingKickoff"] = [
  "instructions",
  "openingKickoff",
];

// The text this part of an activity cloned from clonedFrom resets to: the
// part as the built-in activity it was cloned from has it, or as the open
// chat has it when that is not a built-in activity, such as an activity of
// the user's own.
function defaultActivityPart(
  key: ActivityPartKey,
  clonedFrom: string | undefined,
): string {
  if (clonedFrom !== undefined && isActivityId(clonedFrom)) {
    return getActivity(clonedFrom).parts[key];
  }
  return getActivity(DEFAULT_ACTIVITY_ID).parts[key];
}

// The parts an activity written from scratch starts with: each part as it
// resets with no source, so resetting a part gives back what it started
// with.
function starterActivityParts(): ActivityParts {
  return {
    instructions: defaultActivityPart("instructions", undefined),
    openingKickoff: defaultActivityPart("openingKickoff", undefined),
  };
}

export type { ActivityPartKey };
export { ACTIVITY_PART_KEYS, defaultActivityPart, starterActivityParts };
