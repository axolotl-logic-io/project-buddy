// What each part of an activity is to its editor: the order the parts are
// shown in, and the text each part resets to.
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

export type { ActivityPartKey };
export { ACTIVITY_PART_KEYS, defaultActivityPart };
