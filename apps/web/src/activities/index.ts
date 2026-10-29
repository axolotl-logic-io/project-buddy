import {
  ACTIVITY_IDS,
  type Activity,
  type ActivityId,
  type ActivitySnapshot,
} from "@/activities/activity.ts";
import { brainstorming } from "@/activities/brainstorming.ts";
import { interview } from "@/activities/interview.ts";
import { openChat } from "@/activities/open-chat.ts";
import { projectBreakdown } from "@/activities/project-breakdown.ts";

const ACTIVITY_ID_SET: ReadonlySet<string> = new Set<string>(ACTIVITY_IDS);

const activitiesById: Readonly<Record<ActivityId, Activity>> = {
  "open-chat": openChat,
  interview,
  brainstorming,
  "project-breakdown": projectBreakdown,
};

export type {
  Activity,
  ActivityId,
  ActivityParts,
  ActivitySnapshot,
} from "@/activities/activity.ts";

// The activity a chat starts in when the user picks none.
export const DEFAULT_ACTIVITY_ID: ActivityId = "open-chat";

// The activity every new project's first chat starts in.
export const INTERVIEW_ACTIVITY_ID: ActivityId = "interview";

export function isActivityId(id: string): id is ActivityId {
  return ACTIVITY_ID_SET.has(id);
}

export function listActivities(): Activity[] {
  return ACTIVITY_IDS.map((id) => activitiesById[id]);
}

export function getActivity(id: ActivityId): Activity {
  return activitiesById[id];
}

// The activity as a chat keeps it: its name and parts alone.
export function activitySnapshotOf({
  name,
  parts,
}: ActivitySnapshot): ActivitySnapshot {
  return { name, parts };
}

// Whether text is a built-in activity's opening kickoff, so the mock buddy
// can tell an opening's call from a reply's.
export function isBuiltInOpeningKickoff(text: string): boolean {
  return listActivities().some(({ parts }) => parts.openingKickoff === text);
}
