import type { ActivityId, ActivitySnapshot } from "@/activities/activity.ts";
import { getOwnActivity } from "@/activities/activity-store.ts";
import {
  activitySnapshotOf,
  getActivity,
  isActivityId,
} from "@/activities/index.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";

interface ChatActivity extends ActivitySnapshot {
  readonly id: ActivityId | OwnPromptId;
}

function builtInActivity(id: ActivityId): ChatActivity {
  return { id, ...activitySnapshotOf(getActivity(id)) };
}

async function chosenActivity(
  owner: UserId,
  activityId: string,
): Promise<ChatActivity | undefined> {
  if (isActivityId(activityId)) {
    return builtInActivity(activityId);
  }
  const own = await getOwnActivity(owner, activityId);
  if (own === undefined) {
    return undefined;
  }
  return { id: own.id, name: own.name, definition: own.definition };
}

export type { ChatActivity };
export { builtInActivity, chosenActivity };
