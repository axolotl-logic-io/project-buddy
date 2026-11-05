import {
  ACTIVITY_IDS,
  type Activity,
  type ActivityId,
  type ActivitySnapshot,
} from "@/activities/activity.ts";
import { brainstorming } from "@/activities/brainstorming.ts";
import {
  interview,
  isInterviewOpeningRequest,
} from "@/activities/interview.ts";
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
  ActivityDefinition,
  ActivityId,
  ActivitySnapshot,
} from "@/activities/activity.ts";

export function isActivityId(id: string): id is ActivityId {
  return ACTIVITY_ID_SET.has(id);
}

export function listActivities(): Activity[] {
  return ACTIVITY_IDS.filter((id) => id !== "interview").map(
    (id) => activitiesById[id],
  );
}

export function getActivity(id: ActivityId): Activity {
  return activitiesById[id];
}

export function activitySnapshotOf({
  name,
  definition: parts,
}: ActivitySnapshot): ActivitySnapshot {
  return { name, definition: parts };
}

export function isBuiltInOpeningKickoff(text: string): boolean {
  return (
    isInterviewOpeningRequest(text) ||
    listActivities().some(
      ({ definition: parts }) => parts.openingRequest === text,
    )
  );
}
